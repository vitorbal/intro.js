/*global exports*/
/**
  * Intro.js v0.3.0
  * MIT licensed
  *
  * Original idea and implementation by Afshin Mehrabani (@afshinmeh)
  */
(function(root, factory) {
    'use strict';

    if (typeof exports === 'object') {
        // CommonJS
        factory(exports);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        /*eslint-disable in-valid-define */
        define(['exports'], factory);
        /*eslint-enable in-valid-define */
    } else {
        // Browser globals
        factory(root);
    }
})(this, function(exports) {
    'use strict';
    // Default config/variables
    var VERSION = '0.3.0';

    /**
      * IntroJs main class
      *
      * @class IntroJs
      */
    function IntroJs(obj) {
        this._targetElement = obj;

        this._options = {
            overlayOpacity: 0.5,
            highlightPadding: 10, // padding of the highlight above the current step element
            nextButton: '.introjs-next',
            prevButton: '.introjs-prev',
            skipButton: '.introjs-skip',
            stepIdentifier: '*', // could be a class instead, for example
            // Close introduction when clicking on overlay layer
            exitOnOverlayClick: true,
            // Disable any interaction with the element being highlighted
            disableInteraction: false
        };
    }

    /**
     * @api private
     * @param {HTMLElement} stepElement an element from which to extract data of a single step
     * @returns {Object} The object representation of a single intro step
     */
    function _getStepDataFromElement(stepElement) {
        // use default padding if no custom was provided
        var highlightPadding = stepElement.getAttribute('data-intro-padding') || this._options.highlightPadding;

        return {
            element: this._targetElement.querySelector(stepElement.getAttribute('data-intro-element')), // the element to highlight
            content: _getElementHTML(stepElement),
            step: parseInt(stepElement.getAttribute('data-intro-step'), 10),
            scrollTo: parseInt(stepElement.getAttribute('data-intro-scroll-to'), 10), // custom scrolling offset for this step
            highlightPadding: parseInt(highlightPadding, 10) // custom highlight padding for this step
        };
    }

    /**
     * @api private
     * @param {Object} stepObject JSON object that represents a single step
     * @returns {Object} The object representation of a single intro step
     */
    function _getStepDataFromObject(stepObject) {
        return {
            // the element to highlight
            element: this._targetElement.querySelector(stepObject.element),
            // content of the intro tooltip
            content: _getElementHTML(this._targetElement.querySelector(stepObject.template)),
            step: stepObject.step,
            // custom scrolling offset for this step
            scrollTo: stepObject.scrollTo || null,
            // custom highlight padding for this step
            highlightPadding: stepObject.highlightPadding || this._options.highlightPadding
        };
    }

    /**
      * Initiate a new introduction/guide from an element in the page
      *
      * @api private
      * @method _introForElement
      * @returns {Boolean} Success or not
      */
    function _introForElement() {
        var targetElm = this._targetElement;
        var introItems = [];
        var that = this;
        var i, steps, step, getStepDataFn;

        if (this._options.steps) {
            // use steps passed programmatically
            steps = this._options.steps;
            getStepDataFn = _getStepDataFromObject.bind(this);
        } else {
            // use steps from data-* annotations
            steps = targetElm.querySelectorAll(this._options.stepIdentifier + '[data-intro-step]');
            getStepDataFn = _getStepDataFromElement.bind(this);
        }

        if (steps.length === 0) {
            return false;
        }

        for (i = 0; i < steps.length; i++) {
            step = getStepDataFn(steps[i]);
            introItems.push(step);
        }

        // Ok, sort all items with given steps
        introItems.sort(function(a, b) {
            return a.step - b.step;
        });

        // set it to the introJs object
        this._introItems = introItems;

        // add overlay layer to the page
        if (_addOverlayLayer.call(this, targetElm)) {
            // then, start the show
            _nextStep.call(this);

            this._onKeyDown = function(e) {
                if (e.keyCode === 27) {
                    // escape key pressed, exit the intro
                    _exitIntro.call(that, targetElm);
                } else if (e.keyCode === 37) {
                    // left arrow
                    _previousStep.call(that);
                } else if (e.keyCode === 39 || e.keyCode === 13) {
                    // right arrow or enter
                    _nextStep.call(that);
                }
            };

            if (window.addEventListener) {
                window.addEventListener('keydown', this._onKeyDown, true);
            } else if (document.attachEvent) { //IE
                document.attachEvent('onkeydown', this._onKeyDown);
            }
        }

        return false;
    }

    /*
      * Get the HTML of a DOM element including the element itself
      * http://stackoverflow.com/questions/1763479/how-to-get-the-html-for-a-dom-element-in-javascript
      *
      * @api private
      * @method _getElementHTML
      * @param {Object} el
      * @returns {String} The HTML
      */
    function _getElementHTML(el) {
        var wrap = document.createElement('div');
        wrap.appendChild(el.cloneNode(true));

        return wrap.innerHTML;
    }

    /**
      * Go to specific step of introduction
      *
      * @api private
      * @method _goToStep
      */
    function _goToStep(step) {
        //because steps starts with zero
        this._currentStep = step - 2;
        if (typeof (this._introItems) !== 'undefined') {
            _nextStep.call(this);
        }
    }

    /**
      * Go to next step on intro
      *
      * @api private
      * @method _nextStep
      */
    function _nextStep() {
        if (typeof (this._currentStep) === 'undefined') {
            this._currentStep = 0;
        } else {
            ++this._currentStep;
        }

        if ((this._introItems.length) <= this._currentStep) {
            // end of the intro
            // check if any callback is defined
            if (typeof (this._introCompleteCallback) === 'function') {
                this._introCompleteCallback.call(this);
            }
            _exitIntro.call(this, this._targetElement);
            return;
        }

        var currentItem = this._introItems[this._currentStep];
        _showElement.call(this, currentItem.element, currentItem.content, currentItem.scrollTo, currentItem.highlightPadding);
    }

    /**
      * Go to previous step on intro
      *
      * @api private
      * @method _nextStep
      */
    function _previousStep() {
        if (this._currentStep === 0) {
            return false;
        }

        var currentItem = this._introItems[--this._currentStep];
        _showElement.call(this, currentItem.element, currentItem.content, currentItem.scrollTo, currentItem.highlightPadding);
    }

    /**
      * Exit from intro
      *
      * @api private
      * @method _exitIntro
      * @param {Object} targetElement
      */
    function _exitIntro(targetElement) {
        //remove overlay layer from the page
        var overlayLayer = targetElement.querySelector('.introjs-overlay');
        //for fade-out animation
        overlayLayer.style.opacity = 0;
        setTimeout(function() {
            if (overlayLayer.parentNode) {
                overlayLayer.parentNode.removeChild(overlayLayer);
            }
        }, 500);
        // remove all helper layers
        var helperLayer = targetElement.querySelector('.introjs-helperLayer');
        if (helperLayer) {
            helperLayer.parentNode.removeChild(helperLayer);
        }
        // remove `introjs-showElement` class from the element
        var showElement = document.querySelector('.introjs-showElement');
        if (showElement) {
            showElement.className = showElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, ''); // This is a manual trim.
        }
        // clean listeners
        if (window.removeEventListener) {
            window.removeEventListener('keydown', this._onKeyDown, true);
        } else if (document.detachEvent) { //IE
            document.detachEvent('onkeydown', this._onKeyDown);
        }
        // set the step to zero
        this._currentStep = undefined;
        //check if any callback is defined
        if (this._introExitCallback !== undefined) {
            this._introExitCallback.call(this);
        }
    }

    /**
     * Add disableinteraction layer and adjust the size and position of the layer
     *
     * @api private
     * @method _disableInteraction
     * @param {Object} targetElement the currently highlighted element
     * @param {Integer} highlightPadding padding around the highlight that goes on top of the targetElement
     */
    function _disableInteraction(targetElement, highlightPadding) {
        var disableInteractionLayer = document.querySelector('.introjs-disableInteraction');

        if (disableInteractionLayer === null) {
            disableInteractionLayer = document.createElement('div');
            disableInteractionLayer.className = 'introjs-disableInteraction';
            this._targetElement.appendChild(disableInteractionLayer);
        }

        var elementPosition = _getOffset(targetElement);


        // set new position to helper layer
        disableInteractionLayer.setAttribute('style', 'width: ' + (elementPosition.width + highlightPadding * 2) + 'px; ' +
                                                       'height:' + (elementPosition.height + highlightPadding * 2) + 'px; ' +
                                                       'top:'    + (elementPosition.top - highlightPadding) + 'px;' +
                                                       'left: '  + (elementPosition.left - highlightPadding) + 'px;');
    }


    /**
      * Show an element on the page
      *
      * @api private
      * @method _showElement
      * @param {Object} targetElement the element to highlight
      * @param {Object} content the content of this intro step
      * @param {Integer} scrollTo if set, forces a scroll to position (element - scrollTo) for this intro step
      * @param {Integer} highlightPadding padding around the highlight that goes on top of the targetElement
      */
    function _showElement(targetElement, content, scrollTo, highlightPadding) {

        if (typeof (this._introChangeCallback) !== 'undefined') {
            this._introChangeCallback.call(this, targetElement, content);
        }

        var oldHelperLayer = document.querySelector('.introjs-helperLayer');
        var elementPosition = _getOffset(targetElement);

        if (oldHelperLayer != null) {
            // hide old tooltip
            oldHelperLayer.innerHTML = '';

            // set new position to helper layer
            oldHelperLayer.setAttribute('style', 'width: ' + (elementPosition.width + highlightPadding * 2) + 'px; ' +
                                                 'height:' + (elementPosition.height + highlightPadding * 2) + 'px; ' +
                                                 'top:'    + (elementPosition.top - highlightPadding) + 'px;' +
                                                 'left: '  + (elementPosition.left - highlightPadding) + 'px;');
            // remove old classes
            var oldShowElement = document.querySelector('.introjs-showElement');
            oldShowElement.className = oldShowElement.className.replace(/introjs-[a-zA-Z]+/g, '').replace(/^\s+|\s+$/g, '');
            // we should wait until the CSS3 transition is completed (it's 0.3 sec) to prevent incorrect `height` and `width` calculation
            if (this._lastShowElementTimer) {
                clearTimeout(this._lastShowElementTimer);
            }
            this._lastShowElementTimer = setTimeout(function() {
                // create new tooltip
                oldHelperLayer.innerHTML = content;
                _bindButtons.call(this, oldHelperLayer);
            }.bind(this), 350);

        } else {
            var helperLayer = document.createElement('div');

            helperLayer.className = 'introjs-helperLayer';
            helperLayer.setAttribute('style', 'width: ' + (elementPosition.width + highlightPadding * 2) + 'px; ' +
                                              'height:' + (elementPosition.height + highlightPadding * 2) + 'px; ' +
                                              'top:'    + (elementPosition.top - highlightPadding) + 'px;' +
                                              'left: '  + (elementPosition.left - highlightPadding) + 'px;');

            // add helper layer to target element
            this._targetElement.appendChild(helperLayer);
            helperLayer.innerHTML = content;

            _bindButtons.call(this, helperLayer);
        }

        // disable interaction
        if (this._options.disableInteraction === true) {
            _disableInteraction.call(this, targetElement, highlightPadding);
        }

        // add target element position style
        targetElement.className += ' introjs-showElement';

        // thanks to JavaScript Kit: http://www.javascriptkit.com/dhtmltutors/dhtmlcascade4.shtml
        var currentElementPosition = '';
        if (targetElement.currentStyle) { // IE
            currentElementPosition = targetElement.currentStyle.position;
        } else if (document.defaultView && document.defaultView.getComputedStyle) { // Firefox
            currentElementPosition = document.defaultView.getComputedStyle(targetElement, null).getPropertyValue('position');
        }

        // I don't know is this necessary or not, but I clear the position for better comparing
        currentElementPosition = currentElementPosition.toLowerCase();
        if (currentElementPosition !== 'absolute' && currentElementPosition !== 'relative') {
            //change to new intro item
            targetElement.className += ' introjs-relativePosition';
        }

        var rect = targetElement.getBoundingClientRect(),
                top = rect.bottom - (rect.bottom - rect.top),
                bottom = rect.bottom - _getWinSize().height;

        // Accept custom data-intro-scroll-to param
        if (scrollTo || scrollTo === 0) {
            window.scrollBy(0, rect.top - scrollTo);

        } else if (!_elementInViewport(targetElement)) {
            // Scroll down
            if (bottom < 0) {
                window.scrollBy(0, bottom + 100); // 70px + 30px padding from edge to look nice

            // Scroll up by default
            } else {
                window.scrollBy(0, top - 30); // 30px padding from edge to look nice
            }
        }
    }

    /**
      * Finds and binds the next, previous and skip buttons of the current tour step
      *
      * @api private
      * @method _bindButtons
      * @param {Object} container to search for buttons
      */
    function _bindButtons(container) {
        var that = this;
        var nextTooltipButton = container.querySelector(this._options.nextButton);
        var prevTooltipButton = container.querySelector(this._options.prevButton);
        var skipTooltipButton = container.querySelector(this._options.skipButton);

        if (nextTooltipButton) {
            nextTooltipButton.onclick = function() {
                _nextStep.call(that);
            };
        }

        if (prevTooltipButton) {
            prevTooltipButton.onclick = function() {
                _previousStep.call(that);
            };
        }

        if (skipTooltipButton) {
            /* eslint-disable no-script-url */
            skipTooltipButton.href = 'javascript:void(0);';
            /* eslint-enable no-script-url */
            skipTooltipButton.onclick = function() {
                _exitIntro.call(that, that._targetElement);
            };
        }
    }

    /**
      * Provides a cross-browser way to get the screen dimensions
      * via: http://stackoverflow.com/questions/5864467/internet-explorer-innerheight
      *
      * @api private
      * @method _getWinSize
      * @returns {Object} width and height attributes
      */
    function _getWinSize() {
        if (window.innerWidth !== undefined) {
            return { width: window.innerWidth, height: window.innerHeight };
        } else {
            var D = document.documentElement;
            return { width: D.clientWidth, height: D.clientHeight };
        }
    }

    /**
      * Checks if an element is visible in the current viewport
      * http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
      *
      * @api private
      * @method _elementInViewport
      * @param {Object} el
      * @return {Boolean} Is the element visible or not
      */
    function _elementInViewport(el) {
        var rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            (rect.bottom + 80) <= window.innerHeight && // add 80 to get the text right
            rect.right <= window.innerWidth
        );
    }

    /**
      * Add overlay layer to the page
      *
      * @api private
      * @method _addOverlayLayer
      * @param {Object} targetElm
      */
    function _addOverlayLayer(targetElm) {
        var overlayLayer = document.createElement('div');
        var styleText = '';

        // set css class name
        overlayLayer.className = 'introjs-overlay';

        // check if the target element is body, we should calculate the size of overlay layer in a better way
        if (targetElm.tagName.toLowerCase() === 'body') {
            styleText += 'top: 0; bottom: 0; left: 0; right: 0; position: fixed;';
            overlayLayer.setAttribute('style', styleText);
        } else {
            // set overlay layer position
            var elementPosition = _getOffset(targetElm);
            if (elementPosition) {
                styleText += 'width: ' + elementPosition.width + 'px; height:' + elementPosition.height + 'px; top:' + elementPosition.top + 'px; left: ' + elementPosition.left + 'px;';
                overlayLayer.setAttribute('style', styleText);
            }
        }

        targetElm.appendChild(overlayLayer);

        if (this._options.exitOnOverlayClick) {
            overlayLayer.onclick = function() {
                _exitIntro.call(this, targetElm);
            }.bind(this);
        }

        setTimeout(function() {
            styleText += 'opacity: ' + this._options.overlayOpacity + ';';
            overlayLayer.setAttribute('style', styleText);
        }.bind(this), 10);

        return true;
    }

    /**
      * Get an element position on the page
      * Thanks to `meouw`: http://stackoverflow.com/a/442474/375966
      *
      * @api private
      * @method _getOffset
      * @param {Object} element
      * @returns Element's position info
      */
    function _getOffset(element) {
        var elementPosition = {};

        // set width
        elementPosition.width = element.offsetWidth;

        // set height
        elementPosition.height = element.offsetHeight;

        // calculate element top and left
        var _x = 0;
        var _y = 0;
        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
            _x += element.offsetLeft;
            _y += element.offsetTop;
            element = element.offsetParent;
        }
        // set top
        elementPosition.top = _y;
        // set left
        elementPosition.left = _x;

        return elementPosition;
    }

    /**
      * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
      * via: http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
      *
      * @param obj1
      * @param obj2
      * @returns obj3 a new object based on obj1 and obj2
      */
    function _mergeOptions(obj1, obj2) {
        var obj3 = {}, attrname;
        for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }

    var introJs = function(targetElm) {
        if (typeof (targetElm) === 'object') {
            // Ok, create a new instance
            return new IntroJs(targetElm);

        } else if (typeof (targetElm) === 'string') {
            // select the target element with query selector
            var targetElement = document.querySelector(targetElm);

            if (targetElement) {
                return new IntroJs(targetElement);
            } else {
                throw new Error('There is no element with given selector.');
            }
        } else {
            return new IntroJs(document.body);
        }
    };

    /**
      * Current IntroJs version
      *
      * @property version
      * @type String
      */
    introJs.version = VERSION;

    // Prototype
    introJs.fn = IntroJs.prototype = {
        clone: function() {
            return new IntroJs(this);
        },
        setOption: function(option, value) {
            this._options[option] = value;
            return this;
        },
        setOptions: function(options) {
            this._options = _mergeOptions(this._options, options);
            return this;
        },
        start: function() {
            _introForElement.call(this);
            return this;
        },
        goToStep: function(step) {
            _goToStep.call(this, step);
            return this;
        },
        exit: function() {
            _exitIntro.call(this, this._targetElement);
        },
        onchange: function(providedCallback) {
            if (typeof (providedCallback) === 'function') {
                this._introChangeCallback = providedCallback;
            } else {
                throw new Error('Provided callback for onchange was not a function.');
            }
            return this;
        },
        oncomplete: function(providedCallback) {
            if (typeof (providedCallback) === 'function') {
                this._introCompleteCallback = providedCallback;
            } else {
                throw new Error('Provided callback for oncomplete was not a function.');
            }
            return this;
        },
        onexit: function(providedCallback) {
            if (typeof (providedCallback) === 'function') {
                this._introExitCallback = providedCallback;
            } else {
                throw new Error('Provided callback for onexit was not a function.');
            }
            return this;
        }
    };

    exports.introJs = introJs;
    return introJs;
});
