/**
 * Copyright (c) 2015 "Fronteer LTD". All rights reserved.
 */

(function() {

    var EMBDR_DOMAIN = 'embdr.io';

    // Variable that keeps track of the timeout id when polling the REST API
    var updateCheckTimeout = null;

    /**
     * Embed a resource in the DOM
     *
     * @param  {Element|String}     element                                         The DOM element (or the id of the DOM element) where the resource preview should be embedded
     * @param  {String}             resourceId                                      The id of the Embdr resource that should be embedded
     * @param  {String}             embedKey                                        The key that can be used to retrieve the Embdr resource. This is provided when the resource was created
     * @param  {Object}             [options]                                       A set of additional embed options
     * @param  {String}             [options.loadingIcon]                           This icon will be used in the loading animation when embedding a document. This defaults to the Embdr logo
     * @param  {Function}           [options.complete]                              Invoked when a resource has been embedded
     * @param  {Object}             [options.complete.resource]                     The full resource data is passed in so you can customise your own message appropriately
     * @param  {Function}           [options.unsupported]                           Invoked when an unsupported resource was uploaded for which no previews can be generated. If this function is omitted an image will be displayed explaining no previews could be generated
     * @param  {Object}             [options.unsupported.resource]                  The full resource data is passed in so you can customise your own message appropriately
     * @param  {Function}           [options.pending]                               Invoked when a resource is still being processed
     * @param  {Object}             [options.pending.resource]                      The full resource data is passed in so you can customise your own message appropriately
     * @param  {Function}           [options.linkEmbeddedAsImage]                   Invoked when a link resource cannot be embedded as an iframe but will be iframed as an image
     * @param  {Object}             [options.linkEmbeddedAsImage.resource]          The full resource data is passed in so you can customise your own message appropriately
     * @return {Object}                                                             An object that holds a `cancel` function that can be used to stop polling for more information if the resource still has `pending` previews
     */
    window.embdr = function(element, resourceId, embedKey, options) {
        // Allow the consumer to pass in element or the id of an element
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        // Default all the options
        options = options || {};
        options.callback = options.callback || function() {};
        options.loadingIcon = options.loadingIcon || '//embdr.io/images/logo.png';
        options.pending = options.pending || '//embdr.io/images/pending.png';
        options.unsupported = options.unsupported || '//embdr.io/images/unsupported.png';
        options.linkEmbeddedAsImage = options.linkEmbeddedAsImage || function() {};

        // Get the data from the REST API and embed the previews (if any)
        return checkForUpdates(element, resourceId, embedKey, options);
    };

    /**
     * Poll the REST API and check if a resource has any updates. When a resource' status is no longer
     * pending it will be embedded into the page
     *
     * @param  {Element}    element         The DOM element where the resource preview should be embedded
     * @param  {String}     resourceId      The id of the Embdr resource that should be embedded
     * @param  {String}     embedKey        The key that can be used to retrieve the Embdr resource. This is provided when the resource was created
     * @param  {Object}     options         A set of additional embed options
     * @api private
     */
    var checkForUpdates = function(element, resourceId, embedKey, options, _nr, _coordinator) {
        _coordinator = _coordinator || {};
        _coordinator.cancel = _coordinator.cancel || function() {
            if (_coordinator.updateCheckTimeout) {
                clearTimeout(_coordinator.updateCheckTimeout);
                _coordinator.updateCheckTimeout = null;
            }
        };

        _nr = _nr || 1;
        getResourceData(resourceId, embedKey, function(err, resource) {
            if (err) {
                return options.unsupported(resource);
            }

            // If we don't support the the type of resource (or worse, something went wrong) we invoke
            // the unsupported function to indicate that we can't deal with the resource. It's up to
            // the consumer to show an appropriate message
            if (resource.status === 'unsupported' || resource.status === 'error') {
                options.unsupported(resource);

            // Check whether we're ready to embed the resource in the DOM. Certain type of files
            // can be embedded straight away (e.g., images) whilst others need some more information
            // to be available (e.g., PDF documents or links)
            } else if (canEmbedNow(resource)) {
                embed(element, resource, options);

            // The resource is still being processed, wait a little while and try again
            } else {
                // Invoke a user provided callback if the resource is still pending
                if (_nr === 1 && options.pending) {
                    options.pending(resource);
                }

                // Try he resource again in a few
                _coordinator.updateCheckTimeout = setTimeout(checkForUpdates, 2000, element, resourceId, embedKey, options, _nr + 1);
            }
        });

        return _coordinator;
    };

    /**
     * Check whether there's enough data present to embed a resource
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource is ready to be embedded in the DOM
     * @api private
     */
    var canEmbedNow = function(resource) {
        return ((resource.status !== 'pending') ||
                (canEmbedAsDocument(resource) && resource.htmlPages.status === 'done') ||
                (canEmbedAsImage(resource)) ||
                (canEmbedAsOEmbed(resource)));
    };

    /**
     * Embed a resource into the page
     *
     * @param  {Element}    element         The DOM element where the resource preview should be embedded
     * @param  {Object}     resource        The resource to embed
     * @param  {Object}     options         A set of additional embed options
     * @api private
     */
    var embed = function(element, resource, options) {
        var html = getEmbedCode(resource, options);
        if (element && html) {
            element.innerHTML = html;
            options.complete(resource);
        }
    };

    /**
     * Get the embed code for a resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getEmbedCode = function(resource, options) {
        var embedType = getEmbedType(resource);

        // Check for document embedding first as it has its own polling logic
        if (embedType === 'document') {
            return getDocumentEmbedCode(resource, options);
        } else if (embedType === 'pending') {
            return getPendingEmbedCode(resource, options);
        } else if (embedType === 'iframe') {
            return getIframeEmbedCode(resource, options);
        } else if (embedType === 'oembed') {
            return getOEmbedEmbedCode(resource, options);
        } else if (embedType === 'image') {
            return getImageEmbedCode(resource, options);
        } else if (embedType === 'unsupported') {
            return getUnsupportedEmbedCode(resource, options);
        }
    };

    /**
     * Get the embed code for a document resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getDocumentEmbedCode = function(resource, options) {
        return '<iframe class="embdr-document" width="600" height="800" frameborder="0"' +
            'src="//' + EMBDR_DOMAIN + '/document.html?id=' + resource.id + '&embedKey=' + resource.embedKey + '&loadingIcon=' + options.loadingIcon + '"' +
            'webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="" allowscriptaccess="always" scrolling="no">' +
            '</iframe>';
    };

    /**
     * Get the embed code for a document that can be embedded through oEmbed
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getOEmbedEmbedCode = function(resource, options) {
        var protocol = document.location.protocol.split(':')[0];
        return resource.metadata[protocol + 'Oembed'].html;
    };

    /**
     * Get the embed code for an iframe resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getIframeEmbedCode = function(resource, options) {
        // The resource needs to be a link that
        //   a/ allows iframe embedding through its headers
        //   b/ is embeddable over the same protocol as that which the current page is being served over
        var protocol = document.location.protocol.split(':')[0];
        var isEmbeddable = resource.metadata[protocol + 'iFrameEmbeddable'];

        // Embed the resource as an iframe
        if (resource.metadata.redirectUrl || isEmbeddable) {
            var url = resource.metadata.redirectUrl || resource.metadata.url;
            return '<iframe class="embdr-iframe" width="100%" height="390" src="' + url + '" ' +
                'frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen ' +
                'allowscriptaccess="always" scrolling="yes"></iframe>';
        } else {
            // Embed an image if there is one
            if (resource.webshot && resource.webshot.url) {
                // Invoke a user-provided callback function if the link can't be embedded through an iframe
                options.linkEmbeddedAsImage(resource);
                return getImageEmbedCode(resource, options, resource.webshot.url);

            // Something is amiss if there's no webshot image
            } else {
                return getUnsupportedEmbedCode(resource, options);
            }
        }
    };

    /**
     * Get the embed code for an image resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @param  {String}     [url]           The url of the image to embed
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getImageEmbedCode = function(resource, options, url) {
        url = url || '//' + EMBDR_DOMAIN + '/embed/' + resource.id + '/image?embedKey=' + resource.embedKey;
        return '<img class="embdr-image" alt="' + resource.metadata.title + '" title="' + resource.metadata.title + '" ' +
            'src="' + url + '" style="max-width: 100%; max-height: inherit; height: inherit; width: inherit;" />';
    };

    /**
     * Get the embed code for a pending resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getPendingEmbedCode = function(resource, options) {
        // Allow consumers to render their own messages when a resource is still pending
        if (typeof options.pending === 'function') {
            options.pending(resource);
            return null;
        } else {
            return getImageEmbedCode(resource, options, options.pending);
        }
    };

    /**
     * Get the embed code for an unsupported resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getUnsupportedEmbedCode = function(resource, options) {
        // Allow consumers to render their own messages when a resource isn't supported
        if (typeof options.unsupported === 'function') {
            options.unsupported(resource);
            return null;
        } else {
            return getImageEmbedCode(resource, options, options.unsupported);
        }
    };

    /**
     * Get the manner through which the resource should be embedded
     *
     * @param  {Object} resource The resource to embed
     * @return {String}          The manner through which the resource should be embedded
     * @api private
     */
    var getEmbedType = function(resource) {
        // Always use the document processor if the resource can be embedded that way
        if (canEmbedAsDocument(resource)) {
            return 'document';

        // Check whether we can embed an image
        } else if (canEmbedAsImage(resource)) {
            return 'image';

        // Check whether we can embed through oEmbed
        } else if (canEmbedAsOEmbed(resource)) {
            return 'oembed';

        // At this point we have to wait until the resource is done processing
        } else if (resource.status === 'pending') {
            return 'pending';

        // When a resource can be embedded as an iframe, use that embed method
        } else if (canEmbedAsIframe(resource)) {
            return 'iframe';
        }

        return 'unsupported';
    };

    /**
     * Check whether a resource can be embedded as a document
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded as a document
     * @api private
     */
    var canEmbedAsDocument = function(resource) {
        return (resource.htmlPages);
    };

    /**
     * Check whether a resource can be embedded through oEmbed
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded through oEmbed
     * @api private
     */
    var canEmbedAsOEmbed = function(resource) {
        var protocol = document.location.protocol.split(':')[0];
        var oEmbedData = resource.metadata[protocol + 'Oembed'];
        return (oEmbedData && oEmbedData.type && oEmbedData.html);
    };

    /**
     * Check whether a resource can be embedded as an iframe
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded as an iframe
     * @api private
     */
    var canEmbedAsIframe = function(resource) {
        return (resource.mimeType.indexOf('link') === 0);
    };

    /**
     * Check whether a resource can be embedded as an image
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded as an image
     * @api private
     */
    var canEmbedAsImage = function(resource) {
        var imageTypes = [
            'application/dicom',
            'application/postscript',
            'application/tga',
            'application/x-font-ttf',
            'application/x-tga',
            'application/x-targa',
            'image/bmp',
            'image/gif',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/svg+xml',
            'image/targa',
            'image/tga',
            'image/tiff',
            'image/vnd.adobe.photoshop',
            'image/webp',
            'image/x-cmu-raster',
            'image/x-gnuplot',
            'image/x-icon',
            'image/x-targa',
            'image/x-tga',
            'image/x-xbitmap',
            'image/x-xpixmap',
            'image/x-xwindowdump',
            'image/xcf'
        ];
        return (imageTypes.indexOf(resource.mimeType) !== -1);
    };

    /**
     * Get the resource data from the Embdr API
     *
     * @param  {Number}     resourceId                  The id of the resource to get the data for
     * @param  {String}     embedKey                    The key that allows access to the resource data
     * @param  {Function}   callback                    Standard callback function
     * @param  {Object}     callback.err                An error object, if any
     * @param  {Number}     callback.err.code           The HTTP code related to the error
     * @param  {String}     callback.err.msg            A human-readable message explaining the error
     * @param  {Object}     callback.resource           The resource data
     * @api private
     */
    var getResourceData = function(resourceId, embedKey, callback) {
        // Perform an asynchronous HTTP request to the Embdr API
        var request = new XMLHttpRequest();
        request.open('GET', '//' + EMBDR_DOMAIN + '/api/resources/' + resourceId + '/embed?embedKey=' + embedKey, true);

        request.onload = function() {
            // Only accept 200 responses as successful
            if (request.status === 200) {
                var data = JSON.parse(request.responseText);
                return callback(null, data);

            // In case the Embdr API returns an error
            } else {
                return callback({'code': request.status, 'msg': request.responseText});
            }
        };

        /*!
         * In case of connection errors
         */
        request.onerror = function() {
            return callback({'code': 500, 'msg': 'The server could not be reached'});
        };

        request.send();
    };

})();
