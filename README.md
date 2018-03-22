# StarlightMap

StarlightMap is a webpage which provides an interactive map of the Isle of Starlight forum game by LoneStarNorth, accessible at http://willsaveworldforgold.com/forum/viewforum.php?f=11 .

A big thanks to him and to the community for what they are doing on this forum.

## Dependencies
This software depends on
 - MongoDB
 - Nightmare JS
 - xfvb (optional, for server deployment)

If you want to run it, please verify that your server has these installed. Node.js dependencies can be installed by running:
```
npm install
```

## Testing
To set up StarlightMap, ensure that MongoDB is running on default settings (accessible at localhost:27017). If xfvb is available, StarlightMap can be started by running:
```
npm start
```

Alternatively, it is possible to test StarlightMap on a local machine without xfvb by running:
```
node_modules/.bin/webpack && node index.js
```

Either way, the server will listen on port 3000, and thus the page can be viewed at localhost:3000. In order to retrieve or update data (including the map image), send a POST request to localhost:3000/refresh; this can be accomplished via:
```
curl -X POST localhost:3000/refresh
```

If you want to use a different port than the default one, you can set the environment variable `STARLIGHT_PORT`

## Roadmap
- V1
  - [x] Crawl the page
  - [x] Have an interactive map
  - [x] Have a zoom on the map for small screen
  - [ ] Improve the css
  - [x] Have an interactive list of the inhabitants of the island
    - [x] Have a list
    - [x] Make it interactive
- V2
  - [ ] Display craft an magic parts
    - [ ] Craft part
    - [ ] Magic part
  - [ ] Make the map recognize the different tiles
  - [ ] Show the latest forum news
- V3
  - [ ] Crawl the forum to apply action when they are posted
- When I have time
  - [ ] Document the code

## Contributing
To contribute, fork the repo, improve the code, then make a pull request

## License
You are free to use, copy, modify in a free usage my code at the only condition you credits me and the contributors
