import Drawer from './drawer/Drawer'
import Images from './drawer/Images'
import Zoomer from './drawer/Zoomer'
import Hexagon from './hexagon/hexagon'
import { Point } from './drawer/Drawer'

import Requests from './init.js'
import { Card } from './manipulator/manipulator';

// Variables initialisation

const MAP_WIDTH = 962
const MAP_HEIGHT = 924

const canvas = document.querySelector("canvas#map")

const zoomer = new Zoomer(MAP_WIDTH, MAP_HEIGHT)
const drawer = new Drawer(canvas);
const markmap = new Images()
const blankmap = new Images();
let map = markmap;
let clicked = false;
let mousepos = new Point(0, 0)

const data = document.querySelector("div#data")
const dataBlueprint = document.querySelector("div.data")
const dataButton = document.querySelector("button#dataButton")

const inputSearch = document.querySelector('input#search-survivor')

const markButton = document.querySelector("button#markButton")
const blankButton = document.querySelector("button#blankButton")

const turnTitle = document.querySelector("h1#turn")

const stats = document.querySelector("div#stats")

const table = document.querySelector('table#resources')

const tableDetails = document.querySelector('table#resourceDetails')

/**
 * @type {Array<Hexagon>}
 */
const hexagons = []

let cards = []

const factorWidth = () => map.width /canvas.clientWidth / zoomer.scale
const factorHeight = () => map.height /canvas.clientHeight / zoomer.scale

function zoomOffset() {
/* A bit complicate math to translate the coordinate from the scale */
  return {
    x: map.width / 2 + zoomer.offsetX / zoomer.scale - canvas.clientWidth * factorWidth() / 2,
    y: map.height / 2 + zoomer.offsetY / zoomer.scale - canvas.clientHeight * factorHeight() / 2
  }
}

function translateCoordinate (x, y) {
  const posx = factorWidth() * x + zoomOffset().x
  const posy = factorHeight() * y + zoomOffset().y
  return {
    x:  posx,
    y:  posy
  }
}

function fetchMetadata() {
  return fetch(Requests.MetadataRequest()).then(d => d.json())
}

function fetchTurn() {
  return fetch(Requests.TurnRequest()).then(d => d.json())
}

function getSurvivors(x, y) {
  return (((x && y) ? fetch(Requests.InfoRequest(x,y)) : fetch(Requests.AllInfoRequest()))
  .then(d => d.json())
  .then(d => {

    // Cleaning the search
    inputSearch.value = ""

    // Removing all the card
    while(data.lastChild && data.lastChild.nodeName === 'DATA-CARD') {
      data.removeChild(data.lastChild);
    }
    cards = []


    // Populating the data
    for(const inhab of d) {

      // Handling firefox comptibility
      let card;
      let cardObject;
      if(navigator.userAgent.indexOf('Chrome') > -1) {
        card = document.createElement('data-card')
        cardObject = card
      } else {
        cardObject = new Card()
        card = cardObject.div
      }

      const numItems = '' === inhab.items.toString() ? 0 : inhab.items.length;
      // Creating the survivor for data-card
      const survivor = {
        Name: inhab.Name,
        Description: inhab.Description,
        Position: `${inhab.Position.x},${inhab.Position.y}`,
        Health: `${inhab.Health}/${inhab.MaxHealth}`,
        Items: `(${numItems}) ` + inhab.items.toString().replace(/,/g,', ')
      }

       // Pretifiying the conditions and jobs
      if (!inhab.conditions.includes("")) {
        survivor.Conditions = inhab.conditions.toString().replace(/,/g,', ')
      }
      if (!inhab.jobs.includes("")) {
        survivor.Jobs = inhab.jobs.toString().replace(/,/g, ', ')
      }

      // Fill the card
      cardObject.fill(survivor)

      // Add event for click
      card.addEventListener('click', e => {
        let hexa = hexagons.find(hexa => hexa.coord.x === inhab.Position.x && hexa.coord.y === inhab.Position.y)
        if(hexa) {
          drawMap(map)
          hexa.draw(drawer, zoomer, zoomOffset())
        }
      })

      // Populating data
      data.append(card)
      cards.push({cardObject, card})
    }
  }))
}

dataButton.addEventListener('click', e => getSurvivors());

function drawMap(m) {
  map = m;
  drawer.setSize(map.width, map.height);
  drawer.clean();
  zoomer.drawZoomed((x, y, scale) => drawer.drawImageScale(x,y, scale ,map), 0, 0);
}

// The search bar
inputSearch.addEventListener('change', (e) => {

  // storing the search value in case we reload th survivors
  const searchValue = e.target.value.toLowerCase()

  const search = () => cards.forEach((element) => {
    if(!element.cardObject.data.Name
      .toLowerCase()
      .match(new RegExp(searchValue))
    ) {
      element.card.hidden = true
    } else {
      element.card.hidden = false
    }
  })

  if(cards.length <= 0) getSurvivors().then(() => {
    e.target.value = searchValue
    search()
  })
  else search()
  
})

function has(pairlist, pair) {
  console.log(pair);
  for(let ii = 0; ii < pairlist.length; ++ii) {
    if (pairlist[ii][0] === pair[0] && pairlist[ii][1] === pair[1]) {
      return true;
    }
  }
  return false;
}

markmap.load('/map', MAP_WIDTH, MAP_HEIGHT, 0, 0).then(_ => {
  drawMap(markmap);

  fetchMetadata().then(metadata => {
    for(let row = 1; row <= 71; row++) {
      let skip = 0;
      for(let col = 0; col < metadata["row-length"][`${row}`]; col++) {
        if (has(metadata["special"], [row, col+1])) {
          console.log(`skip ${row},${col}`);
          skip++;
          continue;
        }
        hexagons.push(new Hexagon(
          metadata["left-offset"][`${row}`] + col * metadata["horizontal-step"],
          metadata["bottom-offset"] + row * metadata["vertical-step"] - Math.round(metadata["flatten"] * row),
          10,
          10,
          row,
          col+1-skip,
        ))
      }
    }

    canvas.addEventListener('mousemove', e => {
      const { x, y } = translateCoordinate(e.offsetX, e.offsetY)

      let hexa = hexagons.find(h => h.isIn(x, y))
      if(hexa) {
        drawMap(map)
        hexa.draw(drawer, zoomer, zoomOffset())
      }

      if(clicked) {
        zoomer.moveZoom(-e.movementX, -e.movementY)
        drawMap(map)
      }
    })

    canvas.addEventListener('wheel', e => {
      zoomer.zoom(-e.deltaY / 1000)
      e.preventDefault()
      drawMap(map)
    })

    canvas.addEventListener('touchstart', e => {
      if (e.touches.length > 1) { return; }
      e.preventDefault()
    })

    canvas.addEventListener('touchmove', e => {
      if (e.touches.length > 1) { return; }
      e.preventDefault()
      const touch = e.changedTouches[0]

      const { x, y } = translateCoordinate(touch.pageX, touch.pageY)

      let hexa = hexagons.find(h => h.isIn(x, y))
      if(hexa) {
        drawMap(map)
        hexa.draw(drawer, zoomer, zoomOffset(), 80 + touch.radiusY)
      }
    })

    canvas.addEventListener('touchend', e => {
      if (e.touches.length > 1) { return; }
      const touch = e.changedTouches[0]

      const { x, y } = translateCoordinate(touch.pageX, touch.pageY)

      let hexa = hexagons.find(h => h.isIn(x, y))
      if(hexa) {
        drawMap(map)
        hexa.draw(drawer, zoomer, zoomOffset())
        getSurvivors(hexa.coord.x, hexa.coord.y)
      }
    })

    canvas.addEventListener('click', e => {
      let hexa = hexagons.find(h => h.active)
      if(hexa) {
        getSurvivors(hexa.coord.x, hexa.coord.y)
      }
    })

    canvas.addEventListener('mousedown', e => clicked = true)
    canvas.addEventListener('mouseup', e => clicked = false)
    canvas.addEventListener('mouseout', e => clicked = false)
  })

  markButton.addEventListener('click', e => {
    drawMap(markmap);
    markButton.classList.add('current');
    blankButton.classList.remove('current');
  });
}, e => console.error(e));

blankmap.load('/blankmap', 962, 924, 0, 0).then(_ => {
  blankButton.addEventListener('click', e => {
    drawMap(blankmap);
    markButton.classList.remove('current');
    blankButton.classList.add('current');
  });
}, e => console.error(e));

fetch(Requests.StatsRequest()).then(d => d.json()).then(d => {

  for (const resource of Object.keys(d).sort()) {
    const rescount = table.insertRow()

    const name = rescount.insertCell()
    name.appendChild(document.createTextNode(`${resource}`))

    const count = rescount.insertCell()
    count.appendChild(document.createTextNode(`${d[resource]}`))

    rescount.addEventListener('click', e => {
      fetch(Requests.DetailsRequest(resource)).then(f => f.json()).then(details => {
        details.sort((a, b) => {
          if(a[3] === b[3]) return 0
          else if(a[3] > b[3]) return 1
          else return -1
        }).reverse()

        while(tableDetails.rows.length != 0) {
          tableDetails.deleteRow(0)
        }

        for(const detail of details) {
          const row = tableDetails.insertRow()
          row.addEventListener('click', e => getSurvivors(detail[1],detail[2]))

          const surName = row.insertCell()
          surName.appendChild(document.createTextNode(`${detail[0]}`))

          const surPos = row.insertCell()
          surPos.appendChild(document.createTextNode(`(${detail[1]},${detail[2]})`))

          surPos.classList.add('location')

          const surCount = row.insertCell()
          surCount.appendChild(document.createTextNode(`${detail[3]}`))
        }
      })
    })
  }
})
fetchTurn().then(d => {
  turnTitle.textContent = d[0].Turn
})
