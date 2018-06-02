# noodle
Tiny flickable slideshow. **2kb gzipped.**

# Usage

### Markup
The *immediate* children of the slideshow element will be transformed into
slides.
```html
<div id='slider'>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>
```

### CSS
Basically, it'll work out of the box without any CSS, but it'll look terrible. I
recommend specifying the width of the slider, and the height and/or width of the
slides. `noodle` will calculate its height based on the height of the first
slide.

### JavaScript
That's pretty much it.
```javascript
import noodle from 'noodle'

const slider = noodle(document.getElementById('slider'))
```

# Options
`noodle` accepts a single options `object` as its second parameter.
```javascript
noodle(node, options)
```
### setHeight
By default, `noodle` calculates slider height based on the first slide. To
disable, set to `false`.

# Events
### select
Fired immediately on slide selection.
```javascript
slider.on('select', index => {})
```
### settle
Fired after the slider settles to its active index.
```javascript
slider.on('settle', index => {})
```

# Properties
### index
```javascript
slider.index // => 3
```

# API
### on(event, callback)
```javascript
slider.on('select', index => {})
```
### select(index)
```javascript
slider.select(3)
```
### prev()
```javascript
slider.prev()
```
### next()
```javascript
slider.next()
```
### resize()
Recalculate slider height and slides position. Use this if the DOM updates or
after images load.
```javascript
slider.resize()
```
### destroy()
```javascript
slider.destroy()
```

# Inspiration
When it comes to slideshows, [Flickity](https://github.com/metafizzy/flickity) sets the bar. [@metafizzy](https://github.com/metafizzy/)'s article, [Math Time: Resting Position](https://metafizzy.co/blog/math-time-resting-position/) was incredibly helpful, and I doubt I would have figured out the velocity maths without it.

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
