import React, { Component } from 'react';
import Sound from 'react-sound';

import styles from './Player.css';

export default class Player extends Component {
  constructor(props){
    super(props);
  }

  render() {
    var playButtonClass = this.props.playStatus===Sound.status.PLAYING ? 'fa fa-pause' : 'fa fa-play';
    if (this.props.songStreamLoading) {
      playButtonClass = 'fa fa-spinner fa-spin fa-fw';
    }

    var progressBarStyle = {"width": this.props.currentSongProgress+"%"};

      return(
          <div className={styles.player_container}>
            <div className={`${styles.player_progress} progress`}>
              <div className={`${styles.player_progress_fill} progress-bar`} style={progressBarStyle} role="progressbar"/>
            </div>

            <a
              href='#'
              className={`btn ${styles.player_btn}`}
              onClick={this.props.prevSongCallback}>
                <i className={`${styles.player_backward} fa fa-backward`}></i>
            </a>
            <a
              href='#'
              className={`btn ${styles.player_btn} ${styles.player_play_btn}`}
              onClick={this.props.togglePlayCallback}>
                <i className={`${playButtonClass} ${styles.player_play}`}></i>
            </a>
            <a
              href='#'
              className={`btn ${styles.player_btn}`}
              onClick={this.props.nextSongCallback}>
                <i className={`${styles.player_forward} fa fa-forward`}></i>
            </a>
          </div>
      );
  }
}