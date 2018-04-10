import tinkerbell from 'tinkerbell'
import rosin from 'rosin'

function ease (t, b, c, d) {
  return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b
}

export default function snapback (slider) {
  let width
  let prevIndex = 0
  let index = 0
  let slidesCount = 0
  const track = document.createElement('div')
  let position = 0
  let delta = 0
  let t = Date.now()
  let velo = 0
  let ticking = false
  let tick = null

  track.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
  `

  function clamp (i) {
    if (i > (slidesCount - 1)) {
      return (slidesCount - 1)
    } else if (i < 0) {
      return 0
    }

    return i
  }

  function mount () {
    for (let i = slider.children.length - 1; i > -1; i--) {
      const slide = slider.children[i]
      track.insertBefore(slide, track.children[0])
      slidesCount++
    }

    slider.appendChild(track)
  }

  function resize () {
    let offset = 0

    width = slider.clientWidth

    for (let i = 0; i < track.children.length; i++) {
      const slide = track.children[i]
      slide.style.transform = `translateX(${offset}px)`
      offset = offset + width
    }

    delta = 0
    position = index * width * -1
    track.style.transform = `translateX(${position}px)`
    slider.style.height = track.children[index].clientHeight + 'px'
  }

  function selectByVelocity () {
    let v = Math.abs(velo)
    const end = index * width * -1
    let curr = position
    let diff = Math.abs(end) - Math.abs(curr)
    let d = diff

    let firstSlide = delta > 0 && index === 0 && prevIndex === 0

    ticking = true

    tick = setInterval(() => {
      if (v > 0.2) {
        v *= 1 - 0.1
        const c = (diff * (1 - (d / diff)))
        position = Math.round(firstSlide ? curr + c : curr - c)
        track.style.transform = `translateX(${position}px)`
        d *= 1 - 0.1
      } else {
        position = end
        track.style.transform = `translateX(${end}px)`
        clearInterval(tick)
        ticking = false
      }
    }, (1000 / 60))
  }

  function selectByIndex () {
    ticking = true

    const end = index * width * -1

    tick = tinkerbell(position, end, 1000, ease)(v => {
      track.style.transform = `translateX(${v}px)`
      position = v
    }, () => {
      track.style.transform = `translateX(${end}px)`
      position = end
      ticking = false
      tick = null
    })
  }

  function whichByDistance (delta) {
    if (delta > (width / 4)) {
      return clamp(index - 1)
    } else if (delta < ((width / 4) * -1)) {
      return clamp(index + 1)
    } else {
      return index
    }
  }

  mount()
  resize()

  window.addEventListener('resize', () => {
    requestAnimationFrame(resize)
  })

  const drag = rosin(slider)

  drag.on('mousedown', (pos, e) => {
    if (ticking && tick) {
      tick.stop ? tick.stop() : clearInterval(tick)
      ticking = false
      velo = 0
      delta = 0
    }
  })

  drag.on('drag', ({ x, y }, e) => {
    velo = ((x - delta) / (e.timeStamp - t)) * (1000 / 60)
    t = e.timeStamp
    delta = x
    track.style.transform = `translateX(${position + delta}px)`
  })

  drag.on('mouseup', () => {
    t = null

    let dir = delta < 0 ? -1 : 1
    let v = Math.abs(velo)

    position = position + delta

    if (v > 20) {
      // get anticipated resting position
      let x = 0
      while (v > 0.7) {
        v *= 1 - 0.2
        x += v
      }
      prevIndex = index
      index = whichByDistance(x * dir)
      selectByVelocity()
      velo = 0
    } else {
      prevIndex = index
      index = whichByDistance(delta)
      velo = 0
      selectByIndex()
    }
  })

  return {
    prev () {
      prevIndex = index
      index = clamp(index - 1)
      selectByIndex()
    },
    next () {
      prevIndex = index
      index = clamp(index + 1)
      selectByIndex()
    }
  }
}
