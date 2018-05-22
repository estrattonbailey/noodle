import tinkerbell from 'tinkerbell'
import rosin from 'rosin'
import mitt from 'mitt'

function ease (t, b, c, d) {
  return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b
}

export default function snapback (slider) {
  let width = slider.clientWidth
  let prevIndex = 0
  let index = 0
  let slidesCount = 0
  const track = document.createElement('div')
  let prevPosition = 0
  let position = 0
  let delta = 0
  let t = Date.now()
  let velo = 0
  let ticking = false
  let tick = null
  let totalTravel = 0

  const ev = mitt()

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
      totalTravel += slide.clientWidth
      track.insertBefore(slide, track.children[0])
      slide.style.position = 'absolute'
      slide.style.top = 0
      slidesCount++
    }

    totalTravel -= width

    slider.appendChild(track)
  }

  function resize () {
    let offset = 0

    width = slider.clientWidth

    for (let i = 0; i < track.children.length; i++) {
      const slide = track.children[i]
      slide.style.left = (i * (slide.clientWidth / width) * 100) + '%'
      offset = offset + slide.clientWidth
    }

    delta = 0
    position = getPosition(index)
    track.style.transform = `translateX(${position}px)`
    slider.style.height = track.children[index].clientHeight + 'px'
  }

  function reset () {
    tick = typeof tick === 'function' ? tick() : clearInterval(tick)
    ticking = false
    delta = 0
    ev.emit('settle', index)
  }

  function done (end) {
    reset()
    position = end
    prevPosition = end
    track.style.transform = `translateX(${end}px)`
  }

  /**
   * Get position at index, basically either prevIndex or index
   */
  function getPosition (ind) {
    let travel = 0
    for (let i = 0; i < ind; i++) {
      travel += track.children[i].clientWidth
    }
    return Math.min(travel, totalTravel) * -1
  }

  function selectByVelocity () {
    ev.emit('select', index)

    let v = Math.abs(velo)
    let prev = getPosition(prevIndex)
    const end = getPosition(index)
    const curr = position
    let diff = Math.abs(end) - Math.abs(position)
    let d = diff

    const isAtZero = delta > 0 && index === 0 && prevIndex === 0
    const isAtLastSlide = Math.abs(prev) > totalTravel

    ticking = true

    tick = setInterval(() => {
      if (v > 0.2) {
        v *= 1 - 0.1
        const c = (diff * (1 - (d / diff)))
        position = isAtZero || isAtLastSlide ? curr + c : curr - c
        track.style.transform = `translateX(${position}px)`
        d *= 1 - 0.1
      } else {
        done(end)
      }
    }, (1000 / 60))
  }

  function selectByIndex () {
    ev.emit('select', index)

    ticking = true

    const nextSlideWidth = track.children[index].clientWidth
    const prev = position // getPosition(prevIndex)
    const next = getPosition(index)

    /**
     * Prevent from traveling beyond the last slide
     */
    if (Math.abs(prev) > totalTravel) return

    if (
      index === track.children.length - 1
      && nextSlideWidth < width
    ) return done(prev)

    tick = tinkerbell(prev, next, 1000, ease)(v => {
      track.style.transform = `translateX(${v}px)`
      position = v
    }, () => {
      done(next)
    })
  }

  function whichByDistance (delta, dir, slidesPast = 0) {
    const i = clamp(index + (slidesPast * dir * -1))
    const threshold = 0.2
    const currSlideWidth = track.children[i].clientWidth
    // console.log(i)
    // console.log(delta, currSlideWidth)
    if (delta > currSlideWidth) {
      // console.log('too far')
      return whichByDistance(delta - currSlideWidth, dir, slidesPast + 1)
    } else if (delta > (currSlideWidth * threshold)) {
      // console.log('prev')
      return clamp(i - dir)
    } else if (delta < ((currSlideWidth * threshold) * -1)) {
      // console.log('next')
      return clamp(i - dir)
    } else {
      // console.log('same')
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
      reset()
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

    let x = 0
    if (v > 0.7) {
      while (v > 0.7) {
        v *= 1 - 0.2
        x += v
      }
    } else {
      console.log('slow')
    }

    prevIndex = index
    index = whichByDistance(Math.abs(delta) + x, dir)
    v > 0.7 ? selectByVelocity() : selectByIndex()
  })

  return {
    on: ev.on,
    prev () {
      prevIndex = index
      index = clamp(index - 1)
      reset()
      prevIndex !== index && selectByIndex()
    },
    next () {
      prevIndex = index
      index = clamp(index + 1)
      reset()
      prevIndex !== index && selectByIndex()
    }
  }
}
