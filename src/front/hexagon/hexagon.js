export default class Hexagon {
  constructor(posx, posy, sizeX, sizeY, coordx, coordy, color = "#FFFFFF") {
    this.pos = {
      x: posx,
      y: posy
    }
    this.size = {
      x: sizeX,
      y: sizeY
    }
    this.coord = {
      x: coordx,
      y: coordy
    }
    this.color = color;
    this.active = false;
  }

  isIn(x, y) {
    if(Math.abs(this.pos.x - x) < this.size.x && Math.abs(this.pos.y - y) < this.size.y) {
      this.active = true;
    } else {
      this.active = false;
    }
    return this.active;
  }

  draw(drawer, zoomer, offset, labelOffset) {
    if (!labelOffset) labelOffset = 0
    drawer.drawHexagon(
      (this.pos.x - offset.x) * zoomer.scale,
      (this.pos.y - offset.y) * zoomer.scale,
      this.size.x * zoomer.scale,
      this.color
    )
    drawer.drawTextBoxed((this.pos.x - offset.x) * zoomer.scale - this.size.x,
                         (this.pos.y - offset.y) * zoomer.scale - this.size.y - 2 - labelOffset,
                         `${this.coord.x}, ${this.coord.y}`,
                         this.color, "#000000")
  }
}
