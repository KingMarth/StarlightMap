const Nightmare = require('puppeteer');
const request = require('request');
const fs = require('fs');

const Logger = require('./Logger');
const Position = require('./classes/Position');
const Inhabitant = require('./classes/Inhabitant');
const { StatusMongoose } = require('./database/Schemes');

const STATUS_PAGE_URL = 'http://willsaveworldforgold.com/forum/viewtopic.php?f=11&t=243';

/**
 * @returns {Nightmare} The Nightmare instance
 */
function getNightmare() {
  return Nightmare({
    gotoTimeout: 120000, // in ms
    executionTimeout: 120000, // in ms
  });
}

function structureTechParser(data) {
  const HealthRegex = /Health: *(\d)+/;

  const ret = data;
  if (ret.health) {
    const parsed = ret.health.match(HealthRegex);
    ret.health = parsed ? parsed[1] : 0;
  }
  return ret;
}

/**
 * Parse a String into a List of inhabitant
 * @param {String} data The data to parse
 */
function survivorParser(data) {
  Logger.debug(data);
  const ConditionsRegex = /Conditions: *((?:\w*[, ]?)*)/;
  const ItemsRegex = /Items: *((?:\w*[, ]?)*)/;
  const PosRegex = /Position: *(\d+), *(\d+)/;
  const HealthRegex = /Health: *(\d+)\/(\d+)/;
  const ProfessionRegex = /Profession: *(([\w?]*[, ]?)*)/;
  const ClassRegex = /Class: *(([\w?]* ?)*)/;
  const DescriptionRegex = /\d, ?(.+)$/;

  const persoMatch = data.trim().split(/\n ?\n/);

  return persoMatch.map((inhabitant) => {
    const details = inhabitant.split(/\n/);
    if (details.length > 3) {
      if (
        details[1].match(PosRegex)
        || details[1].match(HealthRegex)
        || details[1].match(ItemsRegex)
        || details[1].match(ConditionsRegex)) details[1] = '';

      const position = inhabitant.match(PosRegex);
      const health = inhabitant.match(HealthRegex);
      const items = inhabitant.match(ItemsRegex);
      const conditions = inhabitant.match(ConditionsRegex);
      const profession = inhabitant.match(ProfessionRegex);
      const survivorClass = inhabitant.match(ClassRegex);
      const curProfClass = details[1].match(DescriptionRegex);

      /**
       * @type {[{ Name: string, Level: string }]}
       */
      const jobs = [];
      if (profession) {
        profession[1].split(/ +/).forEach((job) => {
          const Name = job.slice(0, -1);
          jobs.push({ Name, Level: '?' });
        });
      }
      if (survivorClass) {
        survivorClass[1].split(/ +/).forEach((job) => {
          const Name = job.slice(0, -1);
          jobs.push({ Name, Level: '?' });
        });
      }
      if (curProfClass) {
        curProfClass[1].split(/, +/).forEach((job) => {
          const [Name, Level] = job.split(' ');
          jobs.push({ Name, Level });
        });
      }

      /*
     * 1: Name
     * 2: Def
     * 3: posx
     * 4: posy
     * 5: Health
     * 6: HealthMax
     * 7: Items
     * 8: Conditions
     * 9: Jobs
     */

      return new Inhabitant(
        details[0],
        details[1],
        position ? position[1] : 0,
        position ? position[2] : 0,
        health ? health[1] : 0,
        health ? health[2] : 0,
        items ? items[1].split(/, */) : [],
        conditions ? conditions[1].split(/, */) : [],
        jobs,
      );
    }
    if (details.length === 3) {
      // Dead
      return new Inhabitant(
        details[0],
        `${details[1]}. ${details[2]}`,
        -1,
        -1,
        0,
        0,
        [],
        ['Dead'],
        [],
      );
    }
    return undefined;
  }).filter(inhab => inhab != null);
}


/**
 * Parse a line with multiple items
 * @param {String} line The line to parse
 */
function parseMultiItems(line) {
  const ItemsRegex = /\d+ [\w *]+,?/g;
  const ItemRegex = /(\d+) ([\w *]+)/;

  const itemsMatch = line.match(ItemsRegex);
  if (!itemsMatch) return [];
  return itemsMatch.map((items) => {
    const [, nb, item] = items.match(ItemRegex);

    return new Array(Number(nb)).fill(item);
  }).reduce((g1, g2) => g1.concat(g2));
}

/**
 * Try to parse a String into a list of Loose items
 * @param {String} data The data to parse
 * TODO The parser actually parse the loose items into inhabitant, give them a proper class
 */
function looseParser(data) {
  const PosRegex = /(\d+), *(\d+) *:/;

  const lines = data.split(/\n/);
  return lines.map((line) => {
    try {
      const position = line.match(PosRegex);
      const items = parseMultiItems(line);
      return new Inhabitant(
        'Loose Items',
        '',
        position ? position[1] : 0,
        position ? position[2] : 0,
        0, 0, // Health, not valid
        items,
        ['Loose'],
        [],
      );
    } catch (e) {
      Logger.error(`Got this error: ${e} with the line ${line}`);
      return undefined;
    }
  }).filter(d => d != null);
}

/**
 * Try to parse a String into a list of Structure
 * @param {String} data The data to parse
 * TODO The parse actually parse the structures into inhabitant, git them a proper class
 */
function structureParser(data) {
  const PosRegex = /(\d+), *(\d+) *:/;
  const HealthRegex = /(\d+)\/(\d+) health/;
  const StorageParser = /health(.*)$/;

  const lines = data.split(/\n/);

  return lines.map((line) => {
    try {
      const position = line.match(PosRegex);
      const name = line.split(/:/)[1];
      const health = line.match(HealthRegex);
      const storage = line.match(StorageParser);
      return new Inhabitant(
        name,
        'Structure',
        position ? position[1] : 0,
        position ? position[2] : 0,
        health ? health[1] : 0,
        health ? health[2] : 0,
        storage ? parseMultiItems(storage[1]) : [''],
        ['Structure'],
        [],
      );
    } catch (e) {
      Logger.error(`Got this error: ${e} with the line ${line}`);
      return undefined;
    }
  }).filter(d => d != null);
}

function MagicParser(data) {
  const StarChartRegex = /^Star Chart: ?(\d+), ?(\d+) *$/;
  const SpellRegex = /^Spell: ?(\w+) *$/;
  const LevelParser = /^Level (\d): (.*)$/;
  const OmCombo = /^Om Combo: (.*)$/;

  const magics = data.split(/\n ?\n/);

  return magics.map((magic) => {
    try {
      const lines = magic.split(/\n/);
      const Name = lines[0];
      const Constelation = lines[1];
      const StarChart = lines[2].match(StarChartRegex);
      const Spell = lines[3].match(SpellRegex);

      const [,,,, ...Levels] = lines;
      let [Om, ...SureLevels] = Levels.reverse();

      SureLevels = SureLevels.map((level) => {
        const parsed = level.match(LevelParser);
        if (parsed[1] != null && parsed[2] != null) {
          return { Level: parsed[1], Description: parsed[2] };
        }
        return undefined;
      });

      if (Om.match(OmCombo) != null) {
         Om = Om.match(OmCombo)[1];
      } else {
        const parsed = Om.match(LevelParser);
        SureLevels.push({
          Level: parsed[1],
          Description: parsed[2]
        });
        Om = null;
      }

      const Magic = {
        Name,
        Constelation,
        StarChart: { x: StarChart[1], y: StarChart[2] },
        Spell: Spell[1],
        Levels: SureLevels,
        OmCombo: Om,
      }

      return Magic
    } catch (e) {
      Logger.error(`Got this error: ${e} with the magic ${magic}`);
      return undefined;
    }
  });
}

function refreshTurn(turn) {
  Logger.info(`Current turn update started: ${turn.designation}`);

  const postid = turn.url.split('#')[1];
  return getNightmare()
    .goto(turn.url)
    .wait(5000)
    .evaluate((id) => {
      const MapUrl = document.querySelector(`#${id} .content > img`).src;
      return JSON.stringify(MapUrl);
    }, postid)
    .run((error, result) => {
      if (error) {
        Logger.error(`Got an error with getting the page: ${error}`);
        return;
      }
      try {
        const jsonResult = JSON.parse(result);
        request(jsonResult).pipe(fs.createWriteStream('save/map.png'));
      } catch (e) {
        Logger.error(`Got an error when downloading the map: ${e}`);
        return;
      }
      Logger.info('Current turn update finished');
    })
    .end();
}

function refresh() {
  Logger.info('Update started');
  return getNightmare()
    .goto(STATUS_PAGE_URL)
    .wait('#p43933')
    .evaluate(() => {
      // ==== Type declaration ====

      /**
       * @typedef {Object} TurnLink
       * @property {String} designation - The designation of the turn
       * @property {String} url - The url to the turn post
       */

      /**
       * The equipement object
       * @typedef {Object} Equipement
       * @property {String} imageUrl - The url to the quipement image
       * @property {String} desc - The description of the equipement
       * @property {String} [bonus] - The possible bonus of the equipement
       * @property {String} [ability] - The possible ability of the equipement,
       */

      /**
       * The structure object
       * @typedef {Object} Structure
       * @property {String} imageUrl - The url to the structure image
       * @property {String} [terrain] - The terrain (if precised) on which the structure must be
       * @property {String} [health] - The maximum health of the structure
       * @property {String} [benefit] - The benefit given by the structure
       */

      /**
       * The object referencing all the possible crafts
       * @typedef {Object} CraftingPost
       * @property {Element} Post - The post where we can found the infos
       * @property {String} TechTreeUrl - The url to the tech tree image
       * @property {Equipement[]} equipements - An array containing all the possible equipements
       * @property {String[]} structures - An array containing all the possible structures
       */

      /**
       * TODO Find a good structure for the content part
       * The object referencing all the informations about magic
       * @typedef {Object} MagicPost
       * @property {Element} Post - The post where we can found info about magic
       * @property {String} imageUrl - The url the magic map
       * @property {String} content - The content of the magic tech tree
       */

      /**
       * The object referencing all the element needed to generate the status
       * @typedef {Object} StatusPost
       * @property {Element} Post - The post of the status
       * @property {String} MapUrl - The url of the map image
       * @property {Element} ActualStatus - The element containing the status
       * @property {TurnLink[]} Turns - The list of the different turns
       * @property {String} LooseItems - The loose items text
       * @property {String} Survivors - The survivors text
       * @property {String} Structures - The structures text
       * @property {CraftingPost} Crafting - The crafting tech tree
       * @property {MagicPost} Magic - The magic tech tree
       */

      /** @type {StatusPost} */
      const StatusPost = {
        Turns: [],
      };

      /** @type {CraftingPost} */
      const CraftingPost = {};

      /** @type {MagicPost} */
      const MagicPost = {};

      [StatusPost.Post, CraftingPost.Post, MagicPost.Post] = document.getElementsByClassName('post');

      StatusPost.ActualStatus = StatusPost.Post.querySelector('.content');

      const [TurnList, Humans, Halflings, Dwarves, Elves, MapImg, Looses, Structures] = StatusPost.ActualStatus.querySelectorAll('img, .quotecontent');

      Array.from(TurnList.querySelectorAll('a')).forEach((turnLink) => {
        if (turnLink instanceof HTMLAnchorElement) {
          StatusPost.Turns.push({ designation: turnLink.text, url: turnLink.href });
        }
      });

      StatusPost.Survivors = `${Humans.firstElementChild.innerText} \n\n${Halflings.firstElementChild.innerText} \n\n${Dwarves.firstElementChild.innerText} \n\n${Elves.firstElementChild.innerText} \n\n`;
      StatusPost.MapUrl = MapImg.src;
      StatusPost.LooseItems = Looses.firstElementChild.innerText;
      StatusPost.Structures = Structures.firstElementChild.innerText;

      // TODO: Proprely parse the craft and the magic

      const CraftingNodes = Array.from(CraftingPost.Post.querySelectorAll('.content > :not(br):not(span)'));

      CraftingPost.TechTreeUrl = CraftingNodes[0].src;

      /**
       * The equipements
       * */
      const EquipementNodes = Array.from(CraftingNodes[1].querySelector('.quotecontent > div').childNodes)
        .filter(x => !(x instanceof HTMLBRElement));

      CraftingPost.equipements = EquipementNodes.reduce((acc, node) => {
        if (node instanceof HTMLImageElement) return [[node.currentSrc], ...acc];
        const [equip, ...next] = acc;
        equip.push(node.textContent);
        return [equip, ...next];
      }, []).map((arr) => {
        /** @type {Equipement} */
        const ret = {};
        [ret.imageUrl, ret.desc, ret.bonus, ret.ability] = arr;
        return ret;
      });

      /**
       * The structures
       * */
      const StructureNodes = Array.from(CraftingNodes[2].querySelector('.quotecontent > div').childNodes)
        .filter(x => !(x instanceof HTMLBRElement));
      CraftingPost.structures = StructureNodes.reduce((acc, node) => {
        if (node instanceof HTMLImageElement) return [[node.currentSrc], ...acc];
        const [struct, ...next] = acc;
        struct.push(node.textContent);
        return [struct, ...next];
      }, []).map((arr) => {
        /** @type {Structure} */
        const struct = {};
        const [image, text1, text2, text3] = arr;
        struct.imageUrl = image;
        if (text3 == null && text2 == null) {
          struct.benefit = text1;
        } else if (text1.match(/Terrain/) != null) {
          struct.terrain = text1;
          struct.health = text2;
          struct.benefit = text3;
        } else {
          struct.health = text1;
          struct.benefit = text2;
        }

        return struct;
      });

      StatusPost.Crafting = CraftingPost;

      MagicPost.imageUrl = MagicPost.Post.querySelector('img').src;
      MagicPost.content = MagicPost.Post.querySelector('.quotecontent > div').innerText;

      StatusPost.Magic = MagicPost;

      return JSON.stringify(StatusPost);
    })
    .run((error, result) => {
      if (error) Logger.error(`Got an error when crawling: ${error}`);
      const res = JSON.parse(result);

      res.Crafting.structures.map(structureTechParser);
      res.Survivors = survivorParser(res.Survivors);
      res.LooseItems = looseParser(res.LooseItems);
      res.Structures = structureParser(res.Structures);
      refreshTurn(res.Turns[res.Turns.length - 1]);

      request(res.MapUrl).pipe(fs.createWriteStream('save/blankmap.png'));

      // ? Here we could optimize by splitting survivors, loose item and structures
      (new StatusMongoose({
        date: new Date(),
        Turn: res.Turns[res.Turns.length - 1].designation,
        Survivors: [...res.Survivors,
          ...res.LooseItems,
          ...res.Structures],
        Craft: res.Crafting,
        Magic: MagicParser(res.Magic.content),
      })).save().then(() => Logger.info('Updated'));
    })
    .end();
}

module.exports = {
  Position,
  Inhabitant,
  refresh,
};
