import tinkerbell from 'tinkerbell'
import rosin from 'rosin'
import srraf from 'srraf'

function ease (t, b, c, d) {
  return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b
}

export default function noodle (slider, opts = {}) {
  opts = Object.assign({
    index: 0,
    a11y: true,
    setHeight: true
  }, opts)

  /**
   * Hoisted variables
   */
  let width = slider.offsetWidth
  let prevIndex = 0
  let index = opts.index
  let slidesCount = 0
  let position = 0
  let delta = 0
  let t = Date.now()
  let velo = 0
  let totalTravel = 0

  let ticking = false
  let dragging = false

  let tick = null
  let dragger = null
  let resizer = null

  let active = false
  let suspended = false // library disabled
  let destroyed = false // user disabled

  const evs = {}

  function on (ev, cb) {
    evs[ev] = (evs[ev] || []).concat(cb)
    return () => {
      evs[ev].splice(evs[ev].indexOf(cb), 1)
    }
  }

  function emit (ev, data) {
    (evs[ev] || []).map(cb => cb(data))
  }

  /**
   * Contains slides
   */
  const track = document.createElement('div')
  track.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
  `

  function clamp (i) {
    return Math.min(Math.max(i, 0), (slidesCount - 1))
  }

  function disableImgDrag () {
    const imgs = slider.getElementsByTagName('img')
    for (let i = 0; i < imgs.length; i++) {
      imgs[i].onmousedown = e => e.preventDefault()
      imgs[i].ontouchstart = e => e.preventDefault()
    }
  }

  /**
   * TODO
   *
   * If slide width were to change on resize, it'll need
   * to re-calc the offsets as it does here.
   */
  function mount () {
    for (let i = slider.children.length - 1; i > -1; i--) {
      const slide = slider.children[i]

      slide.setAttribute('tabindex', '1')

      track.insertBefore(slide, track.children[0])

      slidesCount++
    }

    slider.appendChild(track)
    slider.setAttribute('tabindex', '0')

    position = getPosition(index)
    track.style.transform = `translateX(${position}px)`

    disableImgDrag()

    reflow()
  }

  /**
   * Get's total slide width in comparison to the width of
   * the slider parent. If this is < 0, it means the slides
   * are less wide than the parent, and the slider can be
   * suspended. If it's > 0, we need to slide
   */
  function getTotalTravel () {
    const parent = active ? track : slider

    let w = width * -1

    for (let i = 0; i < parent.children.length; i++) w += parent.children[i].offsetWidth

    return w
  }

  /**
   * Reset slide position within the slider. Happens on resize.
   */
  function reflow () {
    let offset = 0

    for (let i = 0; i < track.children.length; i++) {
      if (i > 0) {
        offset += (i / i) * (track.children[i - 1].offsetWidth / width) * 100
      }

      const slide = track.children[i]
      slide.style.position = 'absolute'
      slide.style.top = 0
      slide.style.left = offset + '%'
    }

    if (opts.setHeight && track.children[index]) slider.style.height = track.children[index].clientHeight + 'px'
  }

  /**
   * Update dimensions and call reflow. Also manages
   * whether or not the slider should be active,
   * based on the totalTravel
   */
  function resize () {
    width = slider.offsetWidth

    totalTravel = getTotalTravel()

    if (totalTravel <= 0 && active) {
      destroy()
    } else if (totalTravel > 0 && !active) {
      init()
    }

    if (active && !suspended) {
      reflow()
      selectByIndex(true) // skip focus, will jump page or slider otherwise
    }
  }

  /**
   * Called after each cell selection,
   * or when sliding is interrupted by another action.
   */
  function reset () {
    tick = typeof tick === 'function' ? tick() : cancelAnimationFrame(tick)
    ticking = false
    delta = 0
    velo = 0
  }

  function focusActiveSlide () {
    if (!opts.a11y) return

    for (let i = 0; i < track.children.length; i++) {
      if (i === index) {
        track.children[i].setAttribute('tabindex', '0')
        track.children[i].focus()
      } else {
        track.children[i].setAttribute('tabindex', '1')
      }
    }
  }

  /**
   * Set active class
   */
  function setActiveSlide () {
    for (let i = 0; i < track.children.length; i++) {
      track.children[i].classList[i === index ? 'add' : 'remove']('is-selected')
    }

    if (opts.setHeight && track.children[index]) slider.style.height = track.children[index].clientHeight + 'px'
  }

  /**
   * Get slide[index] position, either prevIndex or index
   */
  function getPosition (ind) {
    let travel = 0

    for (let i = 0; i < ind; i++) {
      travel += track.children[i].offsetWidth
    }

    return Math.min(travel, totalTravel) * -1
  }

  /**
   * Slide to slide at provided index
   */
  function selectByIndex (skipFocus) {
    ticking = true

    const nextSlideWidth = track.children[index].offsetWidth
    const prev = position // basically, getPosition(prevIndex)
    const next = getPosition(index)

    /**
     * Prevent from traveling beyond the last slide
     */
    if (Math.abs(next) > totalTravel) return reset()

    setActiveSlide()

    tick = tinkerbell(prev, next, 1000, ease)(v => {
      track.style.transform = `translateX(${v}px)`
      position = v
    }, () => {
      !skipFocus && focusActiveSlide()
      reset()
      prevIndex !== index && emit('settle', index)
    })
  }

  /**
   * Calculates which slide the swipe will come to rest on,
   * accounting for momentum calculated in release()
   */
  function whichByDistance (del, slidesPast = 0, dir) {
    const requested = index + (slidesPast * dir * -1)
    const i = clamp(requested)
    const threshold = 0.15
    const currSlideWidth = track.children[i].offsetWidth

    if (requested > (slidesCount - 1) || requested < 0) {
      return i
    } else if (del > currSlideWidth) {
      return whichByDistance(del - currSlideWidth, slidesPast + 1, dir)
    } else if (del > (currSlideWidth * threshold)) {
      return clamp(i - dir)
    } else if (del < ((currSlideWidth * threshold) * -1)) {
      return clamp(i - dir)
    } else {
      return index
    }
  }

  function select (i) {
    i = clamp(i)

    if (index !== i) {
      prevIndex = index
      index = i

      reset()
      selectByIndex()
    }
  }

  /**
   * End flick action and calculate slider resting position,
   * then select that slide
   */
  function release (e) {
    dragging = false

    slider.classList.remove('is-dragging')

    t = null

    let v = Math.abs(velo)

    // starting position for tween
    position = position + delta

    // estimate resting position
    let x = 0
    if (v > 0.1) {
      while (v > 0.1) {
        v *= 1 - 0.15
        x += v
      }
    }

    prevIndex = index
    index = whichByDistance(Math.abs(delta) + x, 0, delta < 0 ? -1 : 1)

    emit('select', index)

    selectByIndex()
  }

  /**
   * Tracks swipe action
   */
  function move ({ x, y }, e) {
    dragging = true
    slider.classList.add('is-dragging')
    velo = ((x - delta) / (e.timeStamp - t)) * (1000 / 60)
    t = e.timeStamp
    delta = x
    track.style.transform = `translateX(${position + delta}px)`
  }

  function start (pos, e) {
    if (ticking && tick) reset()
  }

  function keypress ({ keyCode }) {
    if (slider === document.activeElement || slider.contains(document.activeElement)) {
      if (keyCode === 37) select(index - 1)
      if (keyCode === 39) select(index + 1)
    }
  }

  function destroy () {
    if (suspended || destroyed) return

    /**
     * Execute all at once
     */
    dragger.destroy()

    window.removeEventListener('keydown', keypress)

    for (let i = track.children.length - 1; i > -1; i--) {
      const slide = track.children[i]

      slider.insertBefore(slide, slider.children[0])
      slide.style.position = ''
      slide.style.top = ''
      slide.style.left = ''

      slide.removeAttribute('tabindex')
      slide.classList.remove('is-selected')
    }

    slider.removeAttribute('tabindex')
    slider.removeChild(track)
    slider.style.height = ''

    slider.classList.remove('is-active')

    active = false
    suspended = true

    slidesCount = 0
    prevIndex = 0
    index = 0
    slidesCount = 0
    position = 0

    emit('destroy')
  }

  function init () {
    if (active) return

    totalTravel = getTotalTravel()

    if (totalTravel > 0) {
      mount()
      setActiveSlide()

      dragger = rosin(slider)
      dragger.on('mousedown', start)
      dragger.on('drag', move)
      dragger.on('mouseup', release)

      window.addEventListener('keydown', keypress)

      suspended = false
      active = true

      slider.classList.add('is-active')

      emit('init')
    } else {
      suspended = true
    }
  }

  /**
   * Need this to run even if suspended, so that it
   * can re-init if needed
   */
  resizer = srraf(({ vw, pvw }) => {
    if (destroyed) return
    if (vw !==pvw) resize()
  })

  /**
   * Go go go
   */
  init()

  return {
    on,
    resize,
    select,
    init () {
      init()
      destroyed = false
    },
    destroy () {
      destroy()
      destroyed = true
    },
    get active () {
      return active
    },
    get suspended () {
      return suspended
    },
    get destroyed () {
      return destroyed
    },
    get index () {
      return index
    },
    prev () {
      select(index - 1)
    },
    next () {
      select(index + 1)
    }
  }
}
