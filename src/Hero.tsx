import { createContext, useState, useMemo, useCallback, useContext, useEffect, CSSProperties, memo } from "react";
import './Hero.scss';

const HERO_SLIDE_NEXT_SLIDE_DEFAULT_DELAY_MS = 1000; 

type ChildComponent = JSX.Element | JSX.Element[]

type TitleStringOrElement = string | JSX.Element;

type OnEventTriggeredListener = () => void

type CheckValueFunc = (value: unknown) => boolean

function isDefined(v: unknown): v is Exclude<any, undefined | null> {
  return v !== undefined && v !== null;
}

function isNotFalse(v: unknown): v is Exclude<any, false> {
  return v !== false;
}

function check(...func: CheckValueFunc[]): (value: unknown) => boolean {
  return (value: unknown) => func.reduce((v, f) => v && f(value), true)
}

const useClassNames = (...classNames: Array<string | undefined | false | null>): string => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const classNamesFiltered = useMemo(() => classNames.filter(check(isDefined, isNotFalse)), [...classNames])
  const classNamesStringified = useMemo(() => classNamesFiltered.join(' '), [classNamesFiltered])
  return classNamesStringified;
}

const useElementEventIsTriggered = <T extends HTMLElement>(
  eventName: Parameters<T['addEventListener']>[0],
  ref: T | null,
  onTriggered?: OnEventTriggeredListener,
  currentValue?: boolean
): boolean => {
  const [isTriggered, setIsTriggered] = useState(currentValue ?? false)

  useEffect(() => {
    if (typeof currentValue === 'boolean' && currentValue !== isTriggered) {
      setIsTriggered(currentValue)
    }
  }, [currentValue, isTriggered])

  useEffect(() => {
    if (isTriggered && onTriggered) {
      onTriggered();
    }
  }, [isTriggered, onTriggered])
  
  const callbackIsLoaded = useCallback(() => {
    setIsTriggered(true);
  }, [setIsTriggered])
  useEffect(() => {
    if (isTriggered) {
      return;
    }
    if (!ref) {
      return;
    }
    ref.addEventListener(eventName, callbackIsLoaded)
    return () => {
      ref.removeEventListener(eventName, callbackIsLoaded)
    }
  }, [isTriggered, ref, eventName, callbackIsLoaded])

  return isTriggered;
}

// TODO: modified version of https://dev.to/jmalvarez/check-if-an-element-is-visible-with-react-hooks-27h8
export function useIsElementVisible(elementRef: HTMLElement | null): boolean {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (!elementRef) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting)
    );

    observer.observe(elementRef);
    return () => {
      observer.disconnect();
    };
  }, [elementRef]);

  return isIntersecting;
}

export enum ContentType {
  Video = 'Video',
  Image = 'Image',
}

export enum VideoMimeType {
  MPEG4 = 'mp4',
  MOV = 'mov'
}

export type ContentMimeType<CT extends ContentType> = CT extends ContentType.Video
  ? VideoMimeType
  : never

enum ContentFit {
  None = 'none',
  Fill = 'fill',
  ScaleDown = 'scale-down',
  Contain = 'contain',
  Cover = 'cover',
}

const useContentFitCSS = (contentFit?: ContentFit): CSSProperties => {
  const style: CSSProperties = useMemo(() => contentFit ? ({
    objectFit: contentFit,
  }) : ({}), [contentFit]);
  return style 
}

interface ImageVideoSharedProps {
  url: string;
  caption: string;
  isVisible?: boolean;
  fit?: ContentFit;
  preload?: boolean;
  onLoad?: OnEventTriggeredListener;
}

interface VideoProps extends ImageVideoSharedProps {
  type: VideoMimeType;
  play?: boolean;
  repeat?: boolean;
  onFinished?(): void;
}

function Video({ url, type, play, repeat, caption, isVisible = false, preload = false, fit, onLoad, onFinished }: VideoProps): JSX.Element {
  const [ref, setRef] = useState<HTMLVideoElement | null>(null)
  const isLoaded: boolean = useElementEventIsTriggered('canplay', ref, onLoad);
  const styleContentFit: CSSProperties = useContentFitCSS(fit)

  // TODO: it's better to track the progress to start transition animation
  // when it's enough time to complete the transition before the video has finished.
  useElementEventIsTriggered(
    'ended',
    ref,
    onFinished,
    play === false ? false : undefined, // resets the flag when the video is not played
  );

  const classNames: string = useClassNames(
    'vid',
    !isVisible && 'invisible',
  )
  
  useEffect(() => {
    if (play && ref?.paused) {
      isLoaded && ref?.play();
    }
  }, [play, isLoaded, ref])

  const videoPreload: string = preload ? 'auto' : 'metadata';
  
  // TODO: use different sources to load different quality videos for different devices
  return (
    <video
      ref={setRef}
      style={styleContentFit}
      className={classNames}
      aria-label={caption}
      autoPlay={play}
      muted // TODO: being unmuted video doesn't start playing automatically "DOMException: play() failed because the user didn't interact with the document first"
      preload={videoPreload}
      loop={repeat === true}
    >
      <source src={url} type={`video/${type}`} />
      {/* TODO: there might be different mime types simultaneously */}
    </video>
  )
}

export interface ImageProps extends ImageVideoSharedProps {
}

function Image({ url, caption, isVisible = false, preload = false, fit, onLoad }: ImageProps) {
  const [ref, setRef] = useState<HTMLImageElement | null>(null)
  const styleContentFit: CSSProperties = useContentFitCSS(fit)

  const isLoaded = useElementEventIsTriggered('load', ref);
  useEffect(() => {
    if (!isLoaded || !ref) {
      return
    }
    ref.decode().then(onLoad)
  }, [ref, isLoaded, onLoad])

  const classNames: string = useClassNames(
    'img',
    !isVisible && 'invisible',
  )
  
  if (!isVisible && !preload) {
    return <></>
  }
  // TODO: use "srcset" to load different quality for different devices
  return (
    <img
      ref={setRef}
      style={styleContentFit}
      className={classNames}
      src={url}
      decoding="async"
      alt={caption}
    />
  )
}
export interface HeroComponentContainerSharedProps {
  className?: string;
  classNameVisible?: string;
}

export interface HeroComponentContainerProps extends HeroComponentContainerSharedProps {
  children: ChildComponent;
  isVisible: boolean;
  setElementRef(ref: HTMLElement | null): void;
  title?: TitleStringOrElement;
  style?: CSSProperties;
}

function HeroContainer({ 
  isVisible,
  children,
  style,
  title,
  className,
  classNameVisible,
  setElementRef,
}: HeroComponentContainerProps) {
  const [isVisibleAnimation, setIsVisibleAnimation] = useState(isVisible)

  const classNamesMerged: string = useClassNames(
    className, 
    'Hero_Container', 
    isVisibleAnimation && classNameVisible
  )
  const classNamesWrapperMerged: string = useClassNames(
    'Hero_Container-Wrapper', 
    'Hero_Container-Wrapper--Animated'
  )
  
  useEffect(() => {
    if (isVisible) {
      setIsVisibleAnimation(true)
    }
  }, [isVisible])

  return (
    <div ref={setElementRef} className={classNamesWrapperMerged}>
      {title 
        ? <h2 className="Hero_Container-Wrapper-Title">{title}</h2>
        : null}
      <article className={classNamesMerged} style={style}>
        {children}
      </article>
    </div>
  )
}

export interface HeroCarouselContext {
  isVisible: boolean;
  currentSlideIdx: number;
  currentSlideIsFinished: boolean;
  nextSlideIdx: number;
  setCurrentSlideIsFinished(): void;
  setSlideIsReady(slideIdx: number): void;
  nextSlide(): void;
}

export const HeroCarouselCtx = createContext<HeroCarouselContext>({
  isVisible: true,
  currentSlideIdx: 0,
  currentSlideIsFinished: false,
  nextSlideIdx: 1,
  setCurrentSlideIsFinished() {},
  setSlideIsReady() {},
  nextSlide() {}
})

export const useSlideFinishedTimer = (delaySwitchNextSlideMS: number, slideIdx: number) => {
  const { currentSlideIdx, setCurrentSlideIsFinished }: HeroCarouselContext = useContext(HeroCarouselCtx)

  const setCurrentSlideIsFinishedCallback = useCallback(() => {
    if (currentSlideIdx === slideIdx) {
      setCurrentSlideIsFinished()
    }
  }, [slideIdx, currentSlideIdx, setCurrentSlideIsFinished])
  useEffect(() => {
    if (currentSlideIdx !== slideIdx) {
      return;
    }
    const int = setInterval(setCurrentSlideIsFinishedCallback, delaySwitchNextSlideMS);
    return () => clearInterval(int);
  }, [delaySwitchNextSlideMS, slideIdx, currentSlideIdx, setCurrentSlideIsFinishedCallback])
}

export const useTransformTranslateStyle = (slideIdx: number, isOppositeDirection: boolean = false): CSSProperties => {
  const transformStyleValue: string = `translate(calc(${isOppositeDirection ? '-' : ''}${slideIdx} * 100%))`;
  const style: CSSProperties = useMemo(() => {
    const styles: Partial<CSSProperties> = { transform: transformStyleValue }
    return styles;
  }, [transformStyleValue])

  return style
}

export interface HeroCarouselProps extends HeroComponentContainerSharedProps {
  title: string | JSX.Element;
  children: JSX.Element[];
  transitionAnimation?: string;
}

export function HeroCarousel(
  { title, children, transitionAnimation, ...heroContainerProps }: HeroCarouselProps
): JSX.Element {
  const maxChildIdx = children.length - 1

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0)
  const [currentSlideIsFinished, setCurrentSlideIsFinished] = useState(false)
  const [readySlides, setReadySlides] = useState<number[]>([])
  const nextSlideIdx: number = useMemo(() => 
    currentSlideIdx === maxChildIdx ? 0 : currentSlideIdx + 1, [currentSlideIdx, maxChildIdx])
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null)
  const isVisible = useIsElementVisible(containerRef);

  const setSlideIsReadyCb: HeroCarouselContext['setSlideIsReady'] = useCallback((slideIdx: number) => {
    if (readySlides.includes(slideIdx)) {
      return;
    }
    const nextReadySlides = [...readySlides, slideIdx];
    setReadySlides(nextReadySlides);
  }, [readySlides])
  const nextSlideCb: HeroCarouselContext['nextSlide'] = useCallback(() => {
    if (readySlides.includes(nextSlideIdx)) {
      setCurrentSlideIdx(nextSlideIdx)
      setCurrentSlideIsFinished(false)
    }
  }, [nextSlideIdx, readySlides])
  const setCurrentSlideIsFinishedCb = useCallback(() => {
    setCurrentSlideIsFinished(true)
  }, [])
  const ctx = useMemo<HeroCarouselContext>((() => ({
    isVisible,
    currentSlideIdx,
    currentSlideIsFinished,
    nextSlideIdx,
    setCurrentSlideIsFinished: setCurrentSlideIsFinishedCb,
    setSlideIsReady: setSlideIsReadyCb,
    nextSlide: nextSlideCb,
  })), [isVisible, currentSlideIdx, nextSlideIdx, currentSlideIsFinished, nextSlideCb, setSlideIsReadyCb, setCurrentSlideIsFinishedCb])
  const styleTransformTranslate: CSSProperties = useTransformTranslateStyle(currentSlideIdx, true)
  const styleWithTransitionAnimation: CSSProperties = useMemo(() => {
    if (!transitionAnimation) {
      return styleTransformTranslate; 
    }
    return {
      ...styleTransformTranslate,
      transition: transitionAnimation,
    }
  }, [transitionAnimation, styleTransformTranslate])

  return (
    <HeroContainer {...heroContainerProps} title={title} setElementRef={setContainerRef} isVisible={isVisible}>
      <div className="Hero_Slides-Container" style={styleWithTransitionAnimation}>
        <HeroCarouselCtx.Provider value={ctx}>
          {children}
        </HeroCarouselCtx.Provider>
      </div>
    </HeroContainer>
  )
}

export interface HeroCarouselSlideProps {
  children: JSX.Element;
  slideIdx: number;
  background?: string;
  className?: string;
  title?: TitleStringOrElement;
}

const HeroCarouselSlide = memo((props: HeroCarouselSlideProps) => {
  const { title, children, className, slideIdx, background } = props
  const classNamesMerged: string = useClassNames(className, 'Hero_Slide')
  
  const transformTranslateStyle: CSSProperties = useTransformTranslateStyle(slideIdx)
  const style: CSSProperties = useMemo(() => {
    if (!background) {
      return transformTranslateStyle
    }
    return {
      ...transformTranslateStyle,
      background
    };
  }, [transformTranslateStyle, background])

  return (
    <section className={classNamesMerged} style={style}>
      {title 
        ? <h3 className="Hero_Slide__Title">{title}</h3>
        : null}
      {children}
    </section>
  )
})
HeroCarouselSlide.displayName = 'HeroCarouselSlide'

export interface HeroCarouselSlideAutoSwitchProps extends HeroCarouselSlideProps {
  delayMs: number;
}

function HeroCarouselSlideSwitchOnFinish(props: HeroCarouselSlideProps) {
  const { slideIdx } = props
  const { isVisible, currentSlideIdx, currentSlideIsFinished, nextSlide }: HeroCarouselContext = useContext(HeroCarouselCtx)

  useEffect(() => {
    if (isVisible && currentSlideIsFinished && slideIdx === currentSlideIdx) {
      nextSlide()
    }
  }, [isVisible, slideIdx, currentSlideIdx, currentSlideIsFinished, nextSlide])
  return <HeroCarouselSlide {...props} />
}

function HeroCarouselSlideSwitchOnTimer(props: HeroCarouselSlideAutoSwitchProps) {
  const { delayMs, slideIdx, ...rest } = props
  
  useSlideFinishedTimer(delayMs, slideIdx);
  return <HeroCarouselSlideSwitchOnFinish {...rest} slideIdx={slideIdx} />
}

HeroCarousel.Slide = HeroCarouselSlide;
HeroCarousel.SlideSwitchOnTimer = HeroCarouselSlideSwitchOnTimer;
HeroCarousel.SlideSwitchOnFinish = HeroCarouselSlideSwitchOnFinish;

export interface HeroContentMeta<CT extends ContentType> {
  
  /**
   * The type of an asset - video/image.
   * @date 7/14/2023 - 9:19:14 PM
   *
   * @type {CT}
   */
  type: CT;
  
  /**
   * The url of the asset.
   * @date 7/14/2023 - 9:19:31 PM
   *
   * @type {string}
   */
  url: string;
  
  /**
   * The asset mime type (in case of a video).
   * @date 7/14/2023 - 9:19:40 PM
   *
   * @type {ContentMimeType<CT>}
   */
  mime: ContentMimeType<CT>;
  
  /**
   * A heading to show for this specific slide.
   * @date 7/14/2023 - 9:20:01 PM
   *
   * @type {?TitleStringOrElement}
   */
  title?: TitleStringOrElement;
  
  /**
   * Will be shown if the asset is not rendered by any reason
   * and read by a screen reader.
   * @date 7/14/2023 - 9:20:24 PM
   *
   * @type {?string}
   */
  caption?: string;
  
  /**
   * Switch the slide after this amount of time.
   * @date 7/14/2023 - 9:21:11 PM
   *
   * @type {?number}
   */
  timerMs?: number;
  // TODO: we can actually apply any styles from a JSON string coming from the CMS system.
  
  /**
   * The background of the slide.
   * @date 7/14/2023 - 9:21:32 PM
   *
   * @type {?string}
   */
  background?: string;
   
  /**
   * How the asset should fit into the space of its container.
   * @date 7/14/2023 - 9:21:54 PM
   *
   * @type {?ContentFit}
   */
  fit?: ContentFit;
}

export interface HeroContentProps<CT extends ContentType> extends HeroContentMeta<CT> {
  slideIdx: number;
  isSingleSlide: boolean;
}

export const HeroContent = memo(function HeroContentComponent<CT extends ContentType>(
  { caption, type, mime, url, fit, slideIdx, isSingleSlide }: HeroContentProps<CT>
) {
  // TODO: add is pause and stop playing video and switching slides
  // while the carousel is on pause
  const { 
    isVisible: isSlideVisible, 
    currentSlideIdx,
    nextSlideIdx,
    setSlideIsReady,
    setCurrentSlideIsFinished
  }: HeroCarouselContext = useContext(HeroCarouselCtx)
  const [isSlideReady, setIsSlideReady] = useState(false)

  const onLoad = useCallback(() => {
    setSlideIsReady(slideIdx);
    setIsSlideReady(true);
  }, [slideIdx, setSlideIsReady]);

  const isCurrentSlide = slideIdx === currentSlideIdx
  const isNextSlide = slideIdx === nextSlideIdx
  const isPreloadContent = isCurrentSlide || isNextSlide
  const isVisible = isSlideReady && (isCurrentSlide || isNextSlide)

  let component: JSX.Element
  const elementCaption: string = caption ?? ''

  if (type === ContentType.Video) {
    component = (
      <Video 
        url={url}
        type={mime}
        caption={elementCaption}
        preload={isPreloadContent}
        isVisible={isVisible}
        fit={fit}
        play={isCurrentSlide && isSlideVisible}
        onLoad={onLoad}
        repeat={isSingleSlide}
        onFinished={setCurrentSlideIsFinished}
      />
    );
  } else if (type === ContentType.Image) {
    component = (
      <Image 
        url={url}
        caption={elementCaption}
        fit={fit}
        isVisible={isVisible}
        preload={isPreloadContent}
        onLoad={onLoad}
      />)
  } else {
    // TODO: add a component
    component = <>Unknown content type "${type}"</>
  }
  return component
})

export interface HeroProps<CT extends ContentType> extends HeroComponentContainerSharedProps {
  
  /**
   * Metadata from a CMS system.
   * @date 7/14/2023 - 9:17:23 PM
   *
   * @type {Array<HeroContentMeta<CT>>}
   */
  children: Array<HeroContentMeta<CT>>
  
  /**
   * A title of the whole slide.
   * @date 7/14/2023 - 9:17:49 PM
   *
   * @type {TitleStringOrElement}
   */
  title: TitleStringOrElement;
  
  /**
   * Additional class name.
   * @date 7/14/2023 - 9:18:04 PM
   *
   * @type {?string}
   */
  classNameSlide?: string;
  
  /**
   * CSS 'transition' that is applied to the slide during
   * switching to the next one. 
   * @date 7/14/2023 - 9:18:25 PM
   *
   * @type {?string}
   */
  transitionAnimation?: string;
}

export function Hero<CT extends ContentType>(
  { children, title: mainTitle, classNameSlide, ...heroCarouselProps }: HeroProps<CT>
) {
  const isSingleSlide= children.length === 1
  const childrenElements = children.map(
    ({ timerMs: timer, title: slideTitle, background, url, type, ...contentProps }, slideIdx) => {
      const component: JSX.Element = (
        <Hero.Content
          url={url}
          type={type}
          {...contentProps}
          slideIdx={slideIdx}
          isSingleSlide={isSingleSlide}
        />)
      const heroSlideCommonProps: HeroCarouselSlideProps & { key: string } = {
        children: component,
        slideIdx,
        title: slideTitle,
        key: url,
        background,
        className: classNameSlide,
      } 
      
      const withTimer: boolean = timer !== undefined || type === ContentType.Image; // TODO: image should have it's own logic
      if (withTimer) {
        const delayOpenNextFrameMs: number = Number(timer) || HERO_SLIDE_NEXT_SLIDE_DEFAULT_DELAY_MS;
        return <HeroCarousel.SlideSwitchOnTimer {...heroSlideCommonProps} delayMs={delayOpenNextFrameMs} />
      } else if (type === ContentType.Video) { // TODO: it should be up to the video slide itself
        return <HeroCarousel.SlideSwitchOnFinish {...heroSlideCommonProps} />
      }
      return <HeroCarousel.Slide {...heroSlideCommonProps} />
    })

  return (
    <HeroCarousel 
      title={mainTitle}
      {...heroCarouselProps}
    >
      {childrenElements}
    </HeroCarousel>
  )
}

Hero.Content = HeroContent
