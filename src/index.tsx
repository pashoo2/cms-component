import React from 'react'
import ReactDOM from 'react-dom/client';
import './index.css';
import { ContentType, HeroContentMeta, Hero, VideoMimeType } from './Hero';

const image1Url = process.env.PUBLIC_URL + '/static/logo1.png'
const image2Url = process.env.PUBLIC_URL + '/static/logo2.png'
const video1Url = process.env.PUBLIC_URL + '/static/video1.mp4'
const video2Url = process.env.PUBLIC_URL + '/static/video2.mp4'

const slidesImages: Array<HeroContentMeta<ContentType.Image>> = [
  {
    url: image2Url,
    type: ContentType.Image,
    caption: 'logo 1',
    background: 'rgba(255, 255, 255, .2)',
    timerMs: 1500,
    title: 'UNREAL', // TODO: specify the position - top/center/bottom, left/right
    fit: 'contain',
  } as HeroContentMeta<ContentType.Image>,
  {
    url: image1Url,
    type: ContentType.Image,
    caption: 'logo 2',
    title: 'ENGINE',
    background: 'rgba(255, 255, 255, .33)',
    timerMs: 2000,
  } as HeroContentMeta<ContentType.Image>,
]
const slidesVideos: Array<HeroContentMeta<ContentType>> = [
  {
    mime: VideoMimeType.MPEG4, 
    url: video1Url,
    type: ContentType.Video,
  },
  {
    mime: VideoMimeType.MPEG4,
    url: video2Url,
    type: ContentType.Video,
  }
]
const slidesMixed = [
  {
    url: image1Url,
    type: ContentType.Image,
    caption: 'logo 2',
    title: `
      ENGINE
      IS THE BEST
    `,
    background: 'rgba(255, 255, 255, .33)',
    timerMs: 2000,
  } as HeroContentMeta<ContentType.Image>,
  ...slidesVideos,  
]
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <div style={{ background: 'rgb(14, 17, 40)', color: 'rgb(253, 253, 253)' }}>
      Content above
      <Hero 
        title="Epic"
        transitionAnimation="all .35s ease-in-out"
      >
        {slidesImages}
      </Hero>
      <div style={{ margin: '0 auto', padding: '30vh' }}>
        Content middle - 1
      </div>
      <div className="containerSM">
        <Hero 
          title="Videos"
          transitionAnimation="all .25s"
          className="VisibilityChange"
          classNameVisible="VisibilityChange--Visible"
        >
          {slidesVideos}
        </Hero>
      </div>
      <div style={{ margin: '0 auto', padding: '30vh' }}>
        Content middle - 2
      </div>
      <div className="containerWide">
        <Hero 
          title="Videos and Images"
          className="VisibilityChange"
          classNameVisible="VisibilityChange--Visible"
        >
          {slidesMixed}
        </Hero>
      </div>
      <div className="containerSquashed">
        <Hero 
          title="Single video"
          className="VisibilityChange"
          classNameVisible="VisibilityChange--Visible"
        >
          {[slidesVideos[0]]}
        </Hero>
      </div>
      <div style={{ margin: '0 auto', padding: '30vh' }}>
        Content middle - 3
      </div>
      <div className="containerNarrow">
        <Hero 
          title="Single image"
          className="VisibilityChange"
          classNameVisible="VisibilityChange--Visible"
        >
          {[slidesImages[0]]}
        </Hero>
      </div>
      Content bottom
    </div>
  </React.StrictMode>
);
