import Point from './Drawer'

export default class Zoomer {
  constructor(sizex, sizey) {
    this.offsetX = 0
    this.offsetY = 0
    this.scale = 1
    this.sizex = sizex
    this.sizey = sizey
  }

  limitx() { return (this.scale - 1) * this.sizex / 2 }
  limity() { return (this.scale - 1) * this.sizey / 2 }

  newPoint(x, y) {
    return new Point(x - this.offsetX, y - this.offsetY)
  }

  zoom(deltaZoom) {
    this.scale += deltaZoom
    this.scale = this.scale < 1 ? 1 : this.scale
    this.isOut()
  }

  isOut() {
    if(this.offsetX < -this.limitx()) this.offsetX = -this.limitx()
    if(this.offsetX > this.limitx()) this.offsetX = this.limitx()
    if(this.offsetY < -this.limity()) this.offsetY = -this.limity()
    if(this.offsetY > this.limity()) this.offsetY = this.limity()
  }

  moveZoom(dx, dy) {
    this.offsetX += dx
    this.offsetY += dy
    this.isOut()
  }

  drawZoomed(f, x, y) {
    const newX = x - ((this.scale - 1) * this.sizex / 2) - this.offsetX
    const newY = y - ((this.scale - 1) * this.sizey / 2) - this.offsetY
    f(newX, newY, this.scale)
  }
}
