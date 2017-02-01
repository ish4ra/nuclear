// @flow
import React, { Component } from 'react';
import Axios from 'axios';
import { Link } from 'react-router';
import AlertContainer from 'react-alert';
import Sound from 'react-sound';

import SidebarMenu from './SidebarMenu';
import Navbar from './Navbar';
import QueueBar from './QueueBar';
import DownloadQueue from './DownloadQueue';
import MainContent from './MainContent';
import Player from './Player';
import styles from './Home.css';

const fs = require('fs');
const ytdl = require('ytdl-core');

const enums = require('../api/Enum');


export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      queuebarOpen: false,
      songQueue: [],
      downloadQueue: [],
      playStatus: Sound.status.STOPPED,
      currentSongNumber: 0,
      currentSongUrl: '',
      currentSongPosition: 0,
      currentSongProgress: 0,
      seekFromPosition: 0,
      songStreamLoading: false,
      sidebarContents: enums.SidebarMenuItemEnum.DEFAULT
    };

    this.alertOptions = {
          position: 'bottom right',
          theme: 'dark',
          time: 5000,
          transition: 'fade',
        };
  }

  songLoadingCallback(loading) {
    this.setState({songStreamLoading: !loading.loaded});
  }

  songPlayingCallback(playing) {
    var progress = Math.round((playing.position/playing.duration)*100.0);

    this.setState({
      currentSongPosition: playing.position,
      currentSongProgress: progress
    });
  }

  songFinishedPlayingCallback() {
    this.setState({
      currentSongPosition: 0,
      seekFromPosition: 0,
    });

    if (this.state.currentSongNumber==this.state.songQueue.length-1){
      this.setState({playStatus: Sound.status.STOPPED});
    } else {
      this.nextSong();
    }
  }

  nextSong() {
    // We need to update state in two steps - first we update the current song
    // number, then we update the url to reflect the new number.
    this.setState((prevState, props) => ({
      currentSongNumber: Math.min(
        prevState.currentSongNumber+1,
        prevState.songQueue.length-1
      )}));

      this.setState((prevState, props) => ({
        currentSongUrl: prevState.songQueue[prevState.currentSongNumber].data.streamUrl
      }));
    }

    prevSong() {
      this.setState((prevState, props) => ({
        currentSongNumber: Math.max(
          prevState.currentSongNumber-1,
          0
        )}));

        this.setState((prevState, props) => ({
          currentSongUrl: prevState.songQueue[prevState.currentSongNumber].data.streamUrl
        }));
      }

  videoInfoCallback(song, err, info) {
    var formatInfo = info.formats.filter(function(e){return e.itag=='140'})[0];
    song.data.streamUrl = formatInfo.url;
    song.data.streamUrlLoading = false;
    song.data.streamLength = formatInfo.clen;
    this.setState({songQueue: this.state.songQueue});
  }

  videoInfoThenPlayCallback(song, err, info) {
    this.videoInfoCallback(song, err, info);
    this.togglePlay();
  }

  downloadVideoInfoCallback(song, err, info) {
    var formatInfo = info.formats.filter(function(e){return e.itag=='140'})[0];
    song.length = formatInfo.clen;
    this.setState({});
  }

  playNow(song, callback, event) {
    this.setState({
      playStatus: Sound.status.STOPPED,
      songQueue: [],
      currentSongNumber: 0,
      currentSongPosition: 0,
      seekFromPosition: 0,
      songStreamLoading: false
    });

    this.state.songQueue.length = 0;
    this.addToQueue(song, callback, event);
  }

  toggleQueue() {
    this.setState({sidebarContents: enums.SidebarMenuItemEnum.QUEUE});
  }

  toggleDownloads() {
    this.setState({sidebarContents: enums.SidebarMenuItemEnum.DOWNLOADS});
  }

  sidebarGoBackCallback() {
    this.setState({sidebarContents: ''});
  }

  startDownload() {
    this.state.downloadQueue.map((song)=>{
      if (song.status === enums.DownloadQueueStatusEnum.QUEUED){
        song.status = enums.DownloadQueueStatusEnum.INPROGRESS;

        ytdl(`http://www.youtube.com/watch?v=${song.data.id}`, {quality: '140'})
        .on('data', (chunk)=>{
          song.progress += chunk.length;
          song.progressUpdates++;
          if (song.progressUpdates%10 === 0) {
            this.setState({downloadQueue: this.state.downloadQueue});
          }
        })
        .pipe(fs.createWriteStream(song.data.title+'.m4a'))
        .on('finish', ()=>{
          song.status = enums.DownloadQueueStatusEnum.FINISHED;
          this.setState({downloadQueue: this.state.downloadQueue});
        })
        .on('error', (error)=>{
          song.status = enums.DownloadQueueStatusEnum.ERROR;
          this.setState({downloadQueue: this.state.downloadQueue});
        });
      }
    });

    this.setState({downloadQueue: this.state.downloadQueue});
  }

  addToDownloads(song, object, event) {
    var newDownloadItem = {
      source: song.source,
      status: enums.DownloadQueueStatusEnum.QUEUED,
      length: song.data.streamLength,
      progress: 0,
      progressUpdates: 0,
      data: {
        id: song.data.id,
        title: song.data.title
      }
    };

    ytdl.getInfo(
      `http://www.youtube.com/watch?v=${song.data.id}`,
      this.downloadVideoInfoCallback.bind(this, newDownloadItem)
    );

    this.state.downloadQueue.push(newDownloadItem);
    this.setState(this.state);

    this.showAlertSuccess('Song "'+song.data.title+'" added to downloads.');
  }

  addToQueue(song, callback, event) {
    if (song.source === 'youtube'){
      if (typeof(callback)==='undefined') callback=this.videoInfoCallback;

      song.data.streamUrlLoading=true;
      ytdl.getInfo(
        `http://www.youtube.com/watch?v=${song.data.id}`,
         callback.bind(this, song)
      );

    }

    this.state.songQueue.push(song);
    this.setState({songQueue: this.state.songQueue});
  }

  togglePlay(){
    if (this.state.playStatus===Sound.status.PLAYING) {
      this.setState({playStatus: Sound.status.STOPPED});
    } else {
      this.setState({
        playStatus: Sound.status.PLAYING,
        currentSongUrl: this.state.songQueue[this.state.currentSongNumber].data.streamUrl,
        seekFromPosition: this.state.currentSongPosition
      });
    }
  }

  showAlertInfo(text){
    msg.info(text);
  }

  showAlertSuccess(text){
    msg.success(text);
  }

  render() {
    var sidebarContentsRendered = '';
    switch (this.state.sidebarContents) {
      case enums.SidebarMenuItemEnum.DEFAULT:
        break;
      case enums.SidebarMenuItemEnum.QUEUE:
        sidebarContentsRendered = (
          <QueueBar
          queue={this.state.songQueue}
          currentSong={this.state.currentSongNumber}
          />
        );
        break;

      case enums.SidebarMenuItemEnum.DOWNLOADS:
        sidebarContentsRendered = (
          <DownloadQueue
            downloads={this.state.downloadQueue}
            startDownload={this.startDownload.bind(this)}
          />
        );
        break;
    }

    return (
      <div>
        <SidebarMenu
          playStatus={this.state.playStatus}
          togglePlayCallback={this.togglePlay.bind(this)}
          nextSongCallback={this.nextSong.bind(this)}
          prevSongCallback={this.prevSong.bind(this)}
          songStreamLoading={this.state.songStreamLoading}
          toggleQueue={this.toggleQueue.bind(this)}
          toggleDownloads={this.toggleDownloads.bind(this)}
          goBackCallback={this.sidebarGoBackCallback.bind(this)}
          songQueue={this.state.songQueue}
          currentSongNumber={this.state.currentSongNumber}
          currentSongProgress={this.state.currentSongProgress}
          menu={sidebarContentsRendered}
        />

        <div className={styles.container}>
           <MainContent
             addToQueue={this.addToQueue}
             addToDownloads={this.addToDownloads}
             playNow={this.playNow}
             home={this}
           />

           <AlertContainer
             ref={(a) => global.msg = a}
             {...this.alertOptions}
            />
        </div>

        <Sound
          url={this.state.currentSongUrl}
          playStatus={this.state.playStatus}
          onLoading={this.songLoadingCallback.bind(this)}
          onPlaying={this.songPlayingCallback.bind(this)}
          onFinishedPlaying={this.songFinishedPlayingCallback.bind(this)}
          playFromPosition={this.state.seekFromPosition}
        />

      </div>
    );
  }
}