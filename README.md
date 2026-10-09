# Dijkstra Dash

A self-contained browser game about route optimization and a tiny ice-cream delivery business.

## Run

Open `index.html` in a modern browser. No build step or install is required. The game and save data work locally; the Cities preview uses Leaflet/OpenStreetMap and needs an internet connection.

## Play

1. Choose Cream, Sugar, or Dry Ice from the warehouse to start a supply run.
2. Select a starting lane in the top row of the map.
3. Preview Dijkstra and A\*. The selected route is highlighted against dimmed map tiles; both previews report route cost and cells visited. Use Randomize Path to create a new hurdle and traffic layout with a route not used earlier in the current supply run.
4. Lock the route and wait for the 3-second countdown. Then use the arrow keys or WASD to move one tile at a time. Deviating triggers a live Web Worker recalculation and a traffic penalty.
5. Earn funds, grow inventory, pay daily operating costs, and upgrade warehouse capacity.

Progress is saved in browser local storage. The Transfer tab exports or imports a save as a text code.
