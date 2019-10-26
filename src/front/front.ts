import Images from './drawer/Images';
import Survivor from './types/Survivor';
import Card from './components/Card';
import Requests from './Requests';
import StarMap from './StarMap';
// Variables initialisation

const canvas = document.querySelector<HTMLCanvasElement>('canvas#map');


const markmap = new Images();
const blankmap = new Images();


const data = document.querySelector<HTMLDivElement>('div#data');
const dataButton = document.querySelector<HTMLButtonElement>('button#dataButton');
const inputSearch = document.querySelector<HTMLInputElement>('input#search-survivor');
const markButton = document.querySelector<HTMLButtonElement>('button#markButton');
const blankButton = document.querySelector<HTMLButtonElement>('button#blankButton');
const turnTitle = document.querySelector<HTMLElement>('h1#turn');
const table = document.querySelector<HTMLTableElement>('table#resources');
const tableDetails = document.querySelector<HTMLTableElement>('table#resourceDetails');

let cards: Card[] = [];

function fetchTurn() {
  return fetch(Requests.TurnRequest()).then(d => d.json());
}

function getSurvivors(point?: { x: number, y: number }) {
  return ((point ? fetch(Requests.InfoRequest(point.x, point.y)) : fetch(Requests.AllInfoRequest()))
    .then(d => d.json())
    .then((dat) => {
      // Cleaning the search
      inputSearch.value = '';

      // Removing all the card
      while (data.lastChild && data.lastChild.nodeName === 'DATA-CARD') {
        data.removeChild(data.lastChild);
      }
      cards = [];

      let d;
      if (dat instanceof Array) {
        d = dat;
      } else {
        d = dat.Survivors;
      }

      // Populating the data
      d.forEach((inhab: any) => {
        // Handling firefox comptibility
        const card: Card = new Card();

        const numItems = inhab.items.toString() === '' ? 0 : inhab.items.length;
        // Creating the survivor for data-card
        const survivor: Survivor = {
          Name: inhab.Name,
          Description: inhab.Description,
          Position: `${inhab.Position.x},${inhab.Position.y}`,
          Health: `${inhab.Health}/${inhab.MaxHealth}`,
          Items: `(${numItems}) ${inhab.items.toString().replace(/,/g, ', ')}`,
          Conditions: null,
          Jobs: null,
        };

        // Pretifiying the conditions and jobs
        if (!inhab.conditions.includes('')) {
          survivor.Conditions = inhab.conditions.toString().replace(/,/g, ', ');
        }
        if (!inhab.jobs.includes('')) {
          survivor.Jobs = inhab.jobs.toString().replace(/,/g, ', ');
        }

        // Fill the card
        card.fill(survivor);

        // Add event for click
        card.div.addEventListener('click', () => {
          starmap.unselect();
          const hexa = starmap.findHexagon(inhab.Position.x, inhab.Position.y);
          if (hexa) hexa.select = true
          starmap.drawMap()
        });

        // Populating data
        data.append(card.div);
        cards.push(card);
      });
    }));
}
const starmap = new StarMap(canvas, getSurvivors);

dataButton.addEventListener('click', () => getSurvivors());

// The search bar
inputSearch.addEventListener('change', (e: Event) => {
  // storing the search value in case we reload th survivors
  let searchValue: string;
  if (e.target instanceof HTMLInputElement) {
    searchValue = e.target.value.toLowerCase();
  } else {
    searchValue = '';
  }

  const search = () => cards.forEach((element: Card) => {
    if (!element.data.Name
      .toLowerCase()
      .match(new RegExp(searchValue))
    ) {
      element.hide(true);
    } else {
      element.hide(false);
    }
  });

  if (cards.length <= 0) {
    getSurvivors().then(() => {
      if(e.target instanceof HTMLInputElement) e.target.value = searchValue;
      search();
    });
  } else {
    search();
  }
});

markmap.load('/map', StarMap.MAP_WIDTH, StarMap.MAP_HEIGHT, 0, 0).then(() => {
  starmap.setImage(markmap);

  markButton.addEventListener('click', () => {
    starmap.setImage(markmap)
    markButton.classList.add('current');
    blankButton.classList.remove('current');
  });
}, e => console.error(e));

blankmap.load('/blankmap', 962, 924, 0, 0).then(() => {
  blankButton.addEventListener('click', () => {
    starmap.setImage(blankmap)
    markButton.classList.remove('current');
    blankButton.classList.add('current');
  });
}, e => console.error(e));

fetch(Requests.StatsRequest()).then(d => d.json()).then((d) => {
  Object.keys(d).sort().forEach((resource) => {
    const rescount = table.insertRow();

    const name = rescount.insertCell();
    name.appendChild(document.createTextNode(`${resource}`));

    const count = rescount.insertCell();
    count.appendChild(document.createTextNode(`${d[resource]}`));

    rescount.addEventListener('click', () => {
      fetch(Requests.DetailsRequest(resource)).then(f => f.json()).then((details: any[]) => {
        details.sort((a, b) => {
          if (a[3] === b[3]) return 0;
          if (a[3] > b[3]) return 1;
          return -1;
        }).reverse();

        while (tableDetails.rows.length !== 0) {
          tableDetails.deleteRow(0);
        }

        details.forEach((detail) => {
          const row = tableDetails.insertRow();
          row.addEventListener('click', () => getSurvivors({ x: detail[1], y: detail[2] }));

          const surName = row.insertCell();
          surName.appendChild(document.createTextNode(`${detail[0]}`));

          const surPos = row.insertCell();
          surPos.appendChild(document.createTextNode(`(${detail[1]},${detail[2]})`));

          surPos.classList.add('location');

          const surCount = row.insertCell();
          surCount.appendChild(document.createTextNode(`${detail[3]}`));
        });
      });
    });
  });
});
fetchTurn().then((d) => {
  turnTitle.textContent = d[0].Turn;
});
