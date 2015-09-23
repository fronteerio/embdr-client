# Embdr client

A JavaScript Client to embed Embdr resources in a browser.

## Installation

### From npm

```
npm install embdr-client --save
```

### From bower

```
bower install embdr
```

### Manual

Embdr is a dependency-free project so you can simple copy [embdr.js](https://github.com/fronteerio/embdr-client/blob/master/embdr.js) into your own project.

## Usage

### Basic example

Using Embdr is extremely simple. Simply include the `embdr.js` source, add a div where the previews should be embedded and pass along the *id* and *embed key* of the resource you wish to embed.

```html
<script type="text/javascript" src="embdr.js"></script>

<div id="embed-preview"></div>

<script type="text/javascript">
  var resourceId = 103041;
  var resourceEmbedKey = '9ChJDmb8HH4rfn9GJB1yUO4CU2ejmNrs';
  embdr('embed-preview', resourceId, resourceEmbedKey);
</script>
```

### Callbacks

You can specify a set of optional callbacks that allow you to react to the status of the resource. The following callbacks are currently supported:

 * `pending` - The resource is still being processed
 * `complete` - The resource has been fully processed
 * `unsupported` - The Embdr client can't embed the resource as it's either of an unknown type or processing failed

For example,
```html

<div id="embed-preview" style="display: none;"></div>
<div id="embed-preview-pending" style="display: none;"></div>
<div id="embed-preview-unsupported" style="display: none;"></div>
```

```javascript
var options = {
  'complete': function(resource) {
    showView('complete');
  },
  'pending': function() {
      showView('pending');
  },
  'unsupported': function() {
      showView('unsupported');
  }
};
embdr('embed-preview', resourceId, resourceEmbedKey, options);

function showView(view) {
  // Hide each view
  document.getElementById('embed-preview').style.display = 'none';
  document.getElementById('embed-preview-pending').style.display = 'none';
  document.getElementById('embed-preview-unsupported').style.display = 'none';

  // Show the correct view
  if (view === 'complete') {
      document.getElementById('embed-preview').style.display = 'none';
  } else if (view === 'pending') {
      document.getElementById('embed-preview-pending').style.display = 'none';
  } else if (view === 'unsupported') {
      document.getElementById('embed-preview-unsupported').style.display = 'none';
  }
};
```


### Specify your own logo

When embedding a document and loading pages, Embdr pulsates the Embdr logo to indicate that data is being loaded. You can pass in your own logo or image in the options. Make sure that you include the full domain as the embdr HTML is loaded from a different domain.

```javascript
var options = {
    'loadingIcon': '//' + window.location.host + '/assets/my-logo.png'
};
embdr('embed-preview', resourceId, resourceEmbedKey, options);
```
