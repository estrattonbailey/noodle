# snapback
Flickable slideshow (WIP). **1.85kb gzipped.**

# Usage
```javascript
import snapback from 'snapback'

snapback(document.getElementById('slider'))
```

```html
<div id='slider'>
  <div id='slide'></div>
  <div id='slide'></div>
  <div id='slide'></div>
  <div id='slide'></div>
</div>
```

```css
#slider {
  position: relative;
  overflow: hidden;
  width: 100%;
}
#slide {
  position: absolute;
  top: 0;
  left: 0;
  background: tomato;
  width: 100%;
  height: 500px;
}
```

## License
MIT License © [Eric Bailey](https://estrattonbailey.com)
