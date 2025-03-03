import BaseViewport from './baseViewport';
import KeyboardJS from 'keyboardjs';
import {ShortenedIntronsViewport} from './shortenedIntrons';
import {Subject} from 'rx';
import angular from 'angular';

//just for syntax highlight
const Math = window.Math;
const MAX_PIXEL_PER_BRUSH_BP = 20;

export class Viewport extends BaseViewport {
    element: HTMLElement;
    brushChangeSubject = new Subject();
    blatRegionChangeSubject = new Subject();
    blastRegionChangeSubject = new Subject();
    shortenedIntronsChangeSubject = new Subject();

    margin = 0;

    initialized = false;

    projectContext;

    silentInteractions = false; // true, if `viewport` should not send events (like change position) to global project context

    onDestroy = null;

    _shortenedIntronsViewport;

    browserId = null;

    _blatRegion = null;
    _blastRegion = null;

    constructor(element: HTMLElement, {
        chromosomeSize,
        brush = {
            end: chromosomeSize,
            start: 1
        },
        blatRegion,
        blastRegion
    }, dispatcher, projectContext, margin = 0, browserInitialSetting, vcfDataService) {
        super({
            brush: brush,
            canvas: {
                end: element.clientWidth - 2 * margin,
                start: 0
            },
            chromosome: {
                end: chromosomeSize,
                start: 1
            }
        });
        this.margin = margin;
        this.element = element;
        this.dispatcher = dispatcher;
        this.projectContext = projectContext;
        this.vcfDataService = vcfDataService;
        this.blatRegion = blatRegion;
        this.blastRegion = blastRegion;

        if (browserInitialSetting && browserInitialSetting.browserId && !browserInitialSetting.silentInteractions) {
            this.browserId = browserInitialSetting.browserId;
            this.projectContext.changeViewportState(this.browserId, this.brush, true);
        }
        if (browserInitialSetting && browserInitialSetting.silentInteractions) {
            this.silentInteractions = true;
        }
        this._initSubscriptions();
        this._shortenedIntronsViewport = new ShortenedIntronsViewport(this);
        this.transform(brush);
        this.initialized = true;
    }

    reInitialize(element: HTMLElement, {
        chromosomeSize,
        brush = {
            end: chromosomeSize,
            start: 1
        },
        blatRegion,
        blastRegion
    }, dispatcher, projectContext, margin = 0, browserInitialSetting, vcfDataService) {
        this.initialize({
            brush: brush,
            canvas: {
                end: element.clientWidth - 2 * margin,
                start: 0
            },
            chromosome: {
                end: chromosomeSize,
                start: 1
            }
        });
        this.margin = margin;
        this.element = element;
        this.dispatcher = dispatcher;
        this.projectContext = projectContext;
        this.vcfDataService = vcfDataService;
        this.blatRegion = blatRegion;
        this.blastRegion = blastRegion;

        if (browserInitialSetting && browserInitialSetting.browserId && !browserInitialSetting.silentInteractions) {
            this.browserId = browserInitialSetting.browserId;
            this.projectContext.changeViewportState(this.browserId, this.brush, true);
        }
        if (browserInitialSetting && browserInitialSetting.silentInteractions) {
            this.silentInteractions = true;
        }
        this._initSubscriptions();
        this._shortenedIntronsViewport = new ShortenedIntronsViewport(this);
        this.transform(brush);
        this.initialized = true;
    }


    get isShortenedIntronsMode() {
        return this._shortenedIntronsViewport.shortenedIntronsMode && this.shortenedIntronsViewport.brush;
    }

    get shortenedIntronsViewport(): ShortenedIntronsViewport {
        return this._shortenedIntronsViewport;
    }

    get factor() {
        if (this.isShortenedIntronsMode && this.shortenedIntronsViewport.brush) {
            return this.canvasSize / this.shortenedIntronsViewport.brush.shortenedSize;
        }
        return super.factor;
    }

    get actualBrushSize() {
        if (this.isShortenedIntronsMode && this.shortenedIntronsViewport.brush) {
            return this.shortenedIntronsViewport.brush.shortenedSize;
        }
        return this.brushSize;
    }

    get convert() {
        if (this.isShortenedIntronsMode && this.shortenedIntronsViewport.brush) {
            return this._shortenedConvert;
        }
        return super.convert;
    }

    get project() {
        if (this.isShortenedIntronsMode && this.shortenedIntronsViewport.brush) {
            return this._shortenedProject;
        }
        return super.project;
    }

    get blatRegion() {
        return this._blatRegion;
    }

    set blatRegion(blatRegion) {
        this._blatRegion = blatRegion;
        this.blatRegionChangeSubject.onNext(this);
    }

    get blastRegion() {
        return this._blastRegion;
    }

    set blastRegion(blastRegion) {
        this._blastRegion = blastRegion;
        this.blastRegionChangeSubject.onNext(this);
    }

    _shortenedConvert = {
        brushBP2pixel: bp => bp * this.factor,
        chromoBP2pixel: this.types.convert.bind(this, this.types.chromoBP, this.types.pixel),
        pixel2brushBP: px => px / this.factor,
        pixel2chromoBP: this.types.convert.bind(this, this.types.pixel, this.types.chromoBP)
    };

    _shortenedProject = {
        brushBP2pixel: bp =>
        (
            this.shortenedIntronsViewport.getShortenedRelativePosition(bp) -
            this.shortenedIntronsViewport.brush.relativeStartIndex
        ) * this.factor - this.canvas.start,
        chromoBP2pixel: this.types.project.bind(this, this.types.chromoBP, this.types.pixel),
        pixel2brushBP: px => this.shortenedIntronsViewport
            .translateStartPosition((px - this.canvas.start) / this.factor),
        pixel2chromoBP: this.types.project.bind(this, this.types.pixel, this.types.chromoBP)
    };

    _initSubscriptions() {
        if (this._clearSubscriptions) {
            this._clearSubscriptions();
        }
        const resize = () => {
            this.resize(this.element.clientWidth - 2 * this.margin);
        };
        angular.element(window).on('resize', resize);

        const mouseInCb = () => this.mouseIn = true;
        const mouseOutCb = () => this.mouseIn = true;

        angular.element(this.element).on('mouseover.renderContainer', mouseInCb);
        angular.element(this.element).on('mouseout.renderContainer', mouseOutCb);

        const zoomStepFactor = 10;

        const zoomInCb = () => {
            if (!this.mouseIn)
                return;
            const step = -this.brushSize / zoomStepFactor;
            this.transform({
                end: this.brush.end + step,
                start: this.brush.start - step
            });
        };

        const zoomOutCb = () => {
            if (!this.mouseIn)
                return;
            const step = this.brushSize / zoomStepFactor;
            this.transform({
                end: this.brush.end + step,
                start: this.brush.start - step
            });
        };
        KeyboardJS.on('ctrl + shift + =', zoomInCb);
        KeyboardJS.on('ctrl + shift + -', zoomOutCb);

        const hotKeyListener = (event) => {
            if (event && !this.silentInteractions) {
                const path = event.split('>');
                if (path && path[0] === 'vcf') {
                    const tracksVCF = this.projectContext.getActiveTracks().filter(track => track.format === 'VCF');
                    if(tracksVCF.length !== 0) {
                        const position = Math.floor((this.brush.end + this.brush.start) / 2);
                        if (path[1] === 'nextVariation') {
                            this.vcfDataService.getNextVariations(tracksVCF, this.projectContext.currentChromosome.id, position + 1).then(
                                (data) => {
                                    const minStartIndex = Math.min.apply(Math, data.map(function (d) {
                                        return d.startIndex;
                                    }));
                                    this.selectPosition(minStartIndex);
                                }
                            );
                        } else {
                            this.vcfDataService.getPreviousVariations(tracksVCF, this.projectContext.currentChromosome.id, position - 1).then(
                                (data) => {
                                    const maxStartIndex = Math.max.apply(Math, data.map(function (d) {
                                        return d.startIndex;
                                    }));
                                    this.selectPosition(maxStartIndex);
                                }
                            );
                        }
                    }
                }
            }
        };
        this.dispatcher.on('hotkeyPressed', hotKeyListener);
        this._clearSubscriptions = () => {
            angular.element(window).off('resize', resize);
            angular.element(this.element).off('mouseover.renderContainer', mouseInCb);
            angular.element(this.element).off('mouseout.renderContainer', mouseOutCb);
            KeyboardJS.off('ctrl + shift + =', zoomInCb);
            KeyboardJS.off('ctrl + shift + -', zoomOutCb);
            this.dispatcher.removeListener('hotkeyPressed', hotKeyListener);
            this._clearSubscriptions = undefined;
        };

        this.onDestroy = () => {
            if (this.browserId && !this.silentInteractions) {
                this.projectContext.changeViewportState(this.browserId, undefined);
            }
            if (this._clearSubscriptions) {
                this._clearSubscriptions();
            }
        };
    }

    get canTransform() {
        return !this.isShortenedIntronsMode;
    }

    get centerPosition() {
        if (this.isShortenedIntronsMode && this.shortenedIntronsViewport.brush) {
            return this.shortenedIntronsViewport.brush.center;
        }
        return (this.brush.start + this.brush.end) / 2;
    }

    transform({start = this.brush.start, end = this.brush.end, delta = 0, awakeFromShortenedIntrons = false, finish = true}) {
        const oldBrush = {
            end: this.brush.end,
            start: this.brush.start,
        };
        if (this.convert.chromoBP2pixel(1) > MAX_PIXEL_PER_BRUSH_BP) {
            this.brush = {
                end: this.chromosome.end,
                start: this.chromosome.start
            };
        } else {
            const minBrushLength = this.canvasSize / MAX_PIXEL_PER_BRUSH_BP;

            const length = Math.max(minBrushLength, end - start);

            if (delta) {
                start += delta;
                start = Math.max(this.chromosome.start, start);
                end = Math.min(this.chromosome.end, start + length);
                start = Math.max(this.chromosome.start, end - length);
            }
            else {
                const center = (start + end) / 2;
                start = center - length / 2;
            }
            start = Math.max(this.chromosome.start, start);
            end = Math.min(this.chromosome.end, start + length);
            start = Math.max(this.chromosome.start, end - length);

            const normalize = (val) => Math.max(Math.min(val, this.chromosome.end), this.chromosome.start);

            this.brush = {
                end: normalize(end),
                start: normalize(start)
            };
        }

        if (this.shortenedIntronsViewport && this.shortenedIntronsViewport.shortenedIntronsMode) {
            (async () => {
                await this._shortenedIntronsViewport.transform({
                    delta,
                    end,
                    start,
                });
                if (finish || !this.initialized || oldBrush.start !== this.brush.start || oldBrush.end !== this.brush.end) {
                    if (finish && !this.silentInteractions) {
                        this.projectContext.changeViewportState(this.browserId, Object.assign({}, this.brush));
                    }
                    this.brushChangeSubject.onNext({sender: this, reload: finish});
                }
            })();
        }
        else if (finish || awakeFromShortenedIntrons || !this.initialized || oldBrush.start !== this.brush.start || oldBrush.end !== this.brush.end) {
            if (finish && !this.silentInteractions) {
                this.projectContext.changeViewportState(this.browserId, this.brush);
            }
            this.brushChangeSubject.onNext({sender: this, reload: finish});
        }
    }


    selectInterval(interval) {
        if (!interval) {
            return;
        }
        if (!this.canTransform && !this.silentInteractions) {
            if (!this.browserId) {
                this.projectContext.changeState({viewport: this.brush}, true);
            } else {
                this.projectContext.changeViewportState(this.browserId, this.brush);
            }
            return;
        }
        if (interval.position) {
            this.selectPosition(parseFloat(interval.position));
        } else if (interval.start && interval.end) {
            this.transform({
                end: parseFloat(interval.end),
                start: parseFloat(interval.start)
            });
        }
        else if (interval.start !== undefined && interval.start !== null) {
            const minBpLength = 100;
            const length = Math.max(this.canvasSize / MAX_PIXEL_PER_BRUSH_BP, minBpLength);
            this.transform({
                end: parseFloat(interval.start) + length / 2,
                start: parseFloat(interval.start) - length / 2
            });
        }
    }

    selectPosition(position) {
        if (!position) {
            return;
        }
        if (!this.canTransform && !this.silentInteractions) {
            if (!this.browserId) {
                this.projectContext.changeState({viewport: this.brush}, true);
            } else {
                this.projectContext.changeViewportState(this.browserId, this.brush);
            }
            return;
        }
        if (position === Object(position)) {
            return this.selectInterval(position);
        }
        position = parseInt(position);
        const length = this.brushSize;
        const brush = {
            end: position + length / 2,
            start: position - length / 2
        };
        this.transform(brush);
    }

    _formattedBrush() {
        let {start, end} = this.brush;
        start = parseInt(start);
        end = parseInt(end);
        return {
            end,
            start,
        };
    }
}
