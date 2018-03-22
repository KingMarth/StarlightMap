import Images from './Images'
import Zoomer from './Zoomer'

export class Point {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}

/**
 * Drawer object used to facilite the drawing on canvas part
 * Take an HtmlElement of type canvas as parameter
 **/
export default class Drawer{
  constructor(canvas) {
    if(canvas.tagName !== 'CANVAS') throw new Error("The giving div is Either not a canvas or not an Html element");
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  setSize(x, y) {
    this.canvas.height = y
    this.canvas.width = x
  }

  /**
   * Used to draw a rectangle (pretty obvious)
   **/
  drawRectangle(posX, posY, height, width, color) {
    if(color) this.ctx.fillStyle = color
    this.ctx.fillRect(posX, posY, height, width)
  }

  /**
   * Draw a text in a colored box
   * the posX and posY are the position of the text
   * fontSize is in px
   */
  drawTextBoxed(posX, posY, text, textColor, boxColor, fontSize=12, fontStyle="monospace") {
    this.ctx.font = `${fontSize}px ${fontStyle}`
    const measure = this.ctx.measureText(text)
    this.ctx.fillStyle = boxColor
    this.ctx.fillRect(posX - 2, posY - 2 - fontSize, measure.width + 4, fontSize + 4)
    this.drawText(posX, posY, text, textColor)
  }

  /**
   * Used to draw a text (pretty obvious)
   **/
  drawText(posX, posY, text, color) {
    if(color) this.ctx.fillStyle = color
    this.ctx.fillText(text, posX, posY)
  }

  drawImageScale(posX, posY, scale, image) {
    this.ctx.drawImage(
      image.data,
      image.x,
      image.y,
      image.width,
      image.height,
      posX,
      posY,
      image.width * scale,
      image.height * scale
    )
  }


  HexCorner(center, size, i) {
    const angle_deg = 60 * i + 30
    const angle_rad = Math.PI / 180 * angle_deg
    return new Point(center.x + size * Math.cos(angle_rad),
      center.y + size * Math.sin(angle_rad))
  }

  drawHexagon(posx, posy, size, color) {
    const center = new Point(posx, posy)
    this.ctx.beginPath()
    this.ctx.strokeStyle = color
    let point = this.HexCorner(center, size, 0)
    this.ctx.moveTo(point.x, point.y)

    for(let ii of [1, 2, 3, 4, 5, 0]) {
      point = this.HexCorner(center, size, ii)
      this.ctx.lineTo(point.x, point.y);
    }

    this.ctx.stroke()

  }

  drawImage(posX, posY, width, height, image) {
    this.ctx.drawImage(
      image.data,
      image.x,
      image.y,
      image.width,
      image.height,
      posX,
      posY,
      image.width,
      image.height
    )
  }

  /**
   * Clean the canvas by drawing a white square on the canvas
   **/
  clean() {
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillRect(0,0,1000,1000)
  }

  setFont(font) {
    this.ctx.font = font
  }
}
