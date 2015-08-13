/**
 * Copyright (c) 2015 "Fronteer LTD". All rights reserved.
 */

(function() {

    var EMBDR_DOMAIN = 'embdr.io';

    var EMBDR_TYPES = {
        'document': [
            'application/CDFV2-corrupt',
            'application/msword',
            'application/pdf',
            'application/rdf+xml',
            'application/vnd.ms-excel',
            'application/vnd.ms-excel.12',
            'application/vnd.ms-powerpoint',
            'application/vnd.ms-powerpoint.12',
            'application/vnd.oasis.opendocument.chart',
            'application/vnd.oasis.opendocument.database',
            'application/vnd.oasis.opendocument.formula',
            'application/vnd.oasis.opendocument.graphics',
            'application/vnd.oasis.opendocument.graphics-template',
            'application/vnd.oasis.opendocument.image',
            'application/vnd.oasis.opendocument.presentation',
            'application/vnd.oasis.opendocument.presentation-template',
            'application/vnd.oasis.opendocument.spreadsheet',
            'application/vnd.oasis.opendocument.spreadsheetml',
            'application/vnd.oasis.opendocument.spreadsheet-template',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.oasis.opendocument.text-master',
            'application/vnd.oasis.opendocument.text-web',
            'application/vnd.openofficeorg.extension',
            'application/vnd.openxmlformats-officedocument.presentationml',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.spreadsheetml',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.wordprocessingml',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/x-mspowerpoint',
            'application/x-pdf',
            'application/x-powerpoint',
            'text/plain'
        ],
        'iframe': [
            'link',
            'link/vimeo',
            'link/youtube'
        ],
        'image': [
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
        ]
    };

    /**
     * Embed a resource in the DOM
     *
     * @param  {String}     elementId                               The id of the DOM element where the resource preview should be embedded
     * @param  {String}     resourceId                              The id of the Embdr resource that should be embedded
     * @param  {String}     embedKey                                The key that can be used to retrieve the Embdr resource. This should be part of the response when you created the resource
     * @param  {Object}     [options]                               A set of additional embed options
     * @param  {Object}     [options.callback]                      Invoked when a resource has been embedded or when an error occurred
     * @param  {Object}     [options.callback.err]                  An error object, if any
     * @param  {String}     [options.loadingIcon]                   This icon will be used in the loading animation when embedding a document. This defaults to the Embdr logo
     * @param  {Function}   [options.unsupported]                   Invoked when a resource was uploaded for which no previews can be generated. If this function is omitted an image will be displayed explaining no previews could've been generated
     * @param  {Object}     [options.unsupported.resource]          The full resource data is passed in so you can customise your own message appropriately
     * @param  {Function}   [options.linkEmbeddedAsImage]           Invoked when a link resource cannot be embedded as an iframe but will be iframed as an image
     */
    window.embdr = function(elementId, resourceId, embedKey, options) {
        options = options || {};
        options.callback = options.callback || function() {};
        options.loadingIcon = options.loadingIcon || '//embdr.io/images/logo.png';
        options.unsupported = options.unsupported || '//embdr.io/images/unsupported.png';
        options.linkEmbeddedAsImage = options.linkEmbeddedAsImage || function() {};

        // Get the resource data from the API
        getResourceData(resourceId, embedKey, function(err, resource) {
            if (err) {
                return options.callback(err);
            }

            // Determine how the resource should be embedded
            var embedType = getEmbedType(resource);
            var html = getEmbedCode(resource, embedType, options);

            // Embed it
            var el = document.getElementById(elementId);
            if (el && html) {
                el.innerHTML = html;
            }
            return options.callback();
        });
    };


    /**
     * Get the embed code for a resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {String}     embedType       The manner through which the resource should be embedded
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getEmbedCode = function(resource, embedType, options) {
        if (embedType === 'document') {
            return getDocumentEmbedCode(resource, options);
        } else if (embedType === 'iframe') {
            return getIframeEmbedCode(resource, options);
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
        return [
            '<iframe class="embdr-document" width="600" height="800" frameborder="0"',
            'src="//' + EMBDR_DOMAIN + '/document.html?id=' + resource.id + '&embedKey=' + resource.embedKey + '&loadingIcon=' + options.loadingIcon + '"',
            'webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="" allowscriptaccess="always" scrolling="no">',
            '</iframe>'
        ].join('');
    }

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
        //   b/ embeddable over the same protocol as that which the current page is being served over
        var isEmbeddable = resource.metadata.embeddable
        var protocol = document.location.protocol.split(':')[0];
        var isProtocolCompatible = (protocol === 'http' || (protocol === 'https' && resource.metadata.httpsAccessible));

        // Invoke a user-provided callback function if the link can't be embedded through an iframe
        if (options.linkEmbeddedAsImage && !(isEmbeddable && isProtocolCompatible)) {
            options.linkEmbeddedAsImage(resource);
        }

        return  [
            '<iframe class="embdr-iframe" width="100%" height="390" frameborder="0"',
            'src="//' + EMBDR_DOMAIN + '/embed/' + resource.id + '/iframe?embedKey=' + resource.embedKey + '"',
            'frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen',
            'allowscriptaccess="always" scrolling="yes"></iframe>'
        ].join(' ')
    };

    /**
     * Get the embed code for an image resource
     *
     * @param  {Object}     resource        The resource to get the embed code for
     * @param  {Object}     options         A set of additional embed options
     * @return {String}                     The embed code for a resource
     * @api private
     */
    var getImageEmbedCode = function(resource, options) {
        return [
            '<img class="embdr-image" alt="' + resource.metadata.title + '" title="' + resource.metadata.title + '"',
            'src="//' + EMBDR_DOMAIN + '/embed/' + resource.id + '/image?embedKey=' + resource.embedKey + '"',
            'style="max-width: 100%; max-height: inherit; height: inherit; width: inherit;" />'
        ].join(' ');
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

            // Don't embed anything for unsupported resource
            return null;
        } else {
            return [
                '<img class="embdr-image" alt="' + resource.metadata.title + '" title="' + resource.metadata.title + '"',
                'src="' + options.unsupported + '"',
                'style="max-width: 100%; max-height: inherit; height: inherit; width: inherit;" />'
            ].join('');
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

        // When a resource can be embedded as an iframe, use that embed method
        } else if (canEmbedAsIframe(resource)) {
            return 'iframe';

        // Check whether we can embed an image
        } else if (canEmbedAsImage(resource)) {
            return 'image';
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
        return (EMBDR_TYPES.document.indexOf(resource.mimeType) !== -1);
    };

    /**
     * Check whether a resource can be embedded as an iframe
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded as an iframe
     * @api private
     */
    var canEmbedAsIframe = function(resource) {
        return (EMBDR_TYPES.iframe.indexOf(resource.mimeType) !== -1);
    };

    /**
     * Check whether a resource can be embedded as an image
     *
     * @param  {Object}     resource    The resource to embed
     * @return {Boolean}                `true` if the resource can be embedded as an image
     * @api private
     */
    var canEmbedAsImage = function(resource) {
        return (EMBDR_TYPES.image.indexOf(resource.mimeType) !== -1);
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
