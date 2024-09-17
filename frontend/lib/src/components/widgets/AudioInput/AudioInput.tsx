/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  memo,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react"

import { useTheme } from "@emotion/react"
import WaveSurfer from "wavesurfer.js"
import RecordPlugin from "wavesurfer.js/dist/plugins/record"
import { Delete } from "@emotion-icons/material-outlined"

import { FileUploadClient } from "@streamlit/lib/src/FileUploadClient"
import { WidgetStateManager } from "@streamlit/lib/src/WidgetStateManager"
import { AudioInput as AudioInputProto } from "@streamlit/lib/src/proto"
import Toolbar, {
  ToolbarAction,
} from "@streamlit/lib/src/components/shared/Toolbar"
import {
  isNullOrUndefined,
  labelVisibilityProtoValueToEnum,
  notNullOrUndefined,
} from "@streamlit/lib/src/util/utils"
import { WidgetLabel } from "@streamlit/lib/src/components/widgets/BaseWidget"
import { blend } from "@streamlit/lib/src/theme/utils"
import { uploadFiles } from "@streamlit/lib/src/util/uploadFiles"

import {
  StyledAudioInputContainerDiv,
  StyledWaveformContainerDiv,
  StyledWaveformInnerDiv,
  StyledWaveformTimeCode,
  StyledWaveSurferDiv,
} from "./styled-components"
import NoMicPermissions from "./NoMicPermissions"
import Placeholder from "./Placeholder"
import {
  BAR_GAP,
  BAR_RADIUS,
  BAR_WIDTH,
  CURSOR_WIDTH,
  STARTING_TIME_STRING,
  WAVEFORM_PADDING,
} from "./constants"
import formatTime from "./formatTime"
import AudioInputActionButtons from "./AudioInputActionButtons"

export interface Props {
  element: AudioInputProto
  uploadClient: FileUploadClient
  widgetMgr: WidgetStateManager
  fragmentId?: string
  disabled: boolean
}

const AudioInput: React.FC<Props> = ({
  element,
  uploadClient,
  widgetMgr,
  fragmentId,
  disabled,
}): ReactElement => {
  const theme = useTheme()
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
  const waveSurferRef = React.useRef<HTMLDivElement | null>(null)
  const [deleteFileUrl, setDeleteFileUrl] = useState<string | null>(null)
  const [recordPlugin, setRecordPlugin] = useState<RecordPlugin | null>(null)
  // to eventually show the user the available audio devices
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [availableAudioDevices, setAvailableAudioDevices] = useState<
    MediaDeviceInfo[]
  >([])
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState<
    string | null
  >(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [, setRerender] = useState(0)
  const forceRerender = (): void => {
    setRerender(prev => prev + 1)
  }
  const [progressTime, setProgressTime] = useState(STARTING_TIME_STRING)
  const [recordingTime, setRecordingTime] = useState(STARTING_TIME_STRING)
  const [shouldUpdatePlaybackTime, setShouldUpdatePlaybackTime] =
    useState(false)
  const [hasNoMicPermissions, setHasNoMicPermissions] = useState(false)

  const widgetId = element.id
  const widgetFormId = element.formId

  const uploadTheFile = useCallback(
    (file: File) => {
      uploadFiles({
        files: [file],
        uploadClient,
        widgetMgr,
        widgetInfo: { id: widgetId, formId: widgetFormId },
        fragmentId,
      }).then(({ successfulUploads }) => {
        const upload = successfulUploads[0]
        if (upload && upload.fileUrl.deleteUrl) {
          setDeleteFileUrl(upload.fileUrl.deleteUrl)
        }
      })
    },
    [uploadClient, widgetMgr, widgetId, widgetFormId, fragmentId]
  )

  useEffect(() => {
    // this first part is to ensure we prompt for getting the user's media devices
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        RecordPlugin.getAvailableAudioDevices().then(devices => {
          setAvailableAudioDevices(devices)
          if (devices.length > 0) {
            setActiveAudioDeviceId(devices[0].deviceId)
          }
        })
      })
      .catch(_err => {
        setHasNoMicPermissions(true)
      })
  }, [])

  const handleClear = useCallback(
    ({ updateWidgetManager }: { updateWidgetManager?: boolean }) => {
      if (isNullOrUndefined(wavesurfer) || isNullOrUndefined(deleteFileUrl)) {
        return
      }
      setRecordingUrl(null)
      wavesurfer.empty()
      uploadClient.deleteFile(deleteFileUrl)
      setProgressTime(STARTING_TIME_STRING)
      setRecordingTime(STARTING_TIME_STRING)
      setDeleteFileUrl(null)
      if (updateWidgetManager) {
        widgetMgr.setFileUploaderStateValue(
          element,
          {},
          { fromUi: true },
          fragmentId
        )
      }
      setShouldUpdatePlaybackTime(false)
      if (notNullOrUndefined(recordingUrl)) {
        URL.revokeObjectURL(recordingUrl)
      }
    },
    [
      deleteFileUrl,
      recordingUrl,
      uploadClient,
      wavesurfer,
      element,
      widgetMgr,
      fragmentId,
    ]
  )

  const initializeWaveSurfer = useCallback(() => {
    if (waveSurferRef.current === null) return

    const ws = WaveSurfer.create({
      container: waveSurferRef.current,
      waveColor: theme.colors.primary,
      progressColor: theme.colors.bodyText,
      height:
        parseFloat(getComputedStyle(document.documentElement).fontSize) *
          parseFloat(theme.sizes.largestElementHeight.replace("rem", "")) -
        2 * WAVEFORM_PADDING,
      barWidth: BAR_WIDTH,
      barGap: BAR_GAP,
      barRadius: BAR_RADIUS,
      cursorWidth: CURSOR_WIDTH,
    })

    ws.on("timeupdate", time => {
      setProgressTime(formatTime(time * 1000)) // get from seconds to milliseconds
    })

    ws.on("pause", () => {
      forceRerender()
    })

    const rp = ws.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: false,
        renderRecordedAudio: true,
      })
    )

    rp.on("record-end", blob => {
      const url = URL.createObjectURL(blob)
      setRecordingUrl(url)

      const file = new File([blob], "audio.wav", { type: blob.type })
      uploadTheFile(file)
    })

    rp.on("record-progress", time => {
      setRecordingTime(formatTime(time))
    })

    setWavesurfer(ws)
    setRecordPlugin(rp)

    return () => {
      if (ws) ws.destroy()
      if (rp) rp.destroy()
    }
    // note: intentionally excluding theme so that we don't have to recreate the wavesurfer instance
    // and colors will be updated separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadTheFile])

  useEffect(() => initializeWaveSurfer(), [initializeWaveSurfer])

  useEffect(() => {
    wavesurfer?.setOptions({
      waveColor: recordingUrl
        ? blend(theme.colors.fadedText40, theme.genericColors.secondaryBg)
        : theme.colors.primary,
      progressColor: theme.colors.bodyText,
    })
  }, [theme, recordingUrl, wavesurfer])

  const onClickPlayPause = useCallback(() => {
    if (wavesurfer) {
      wavesurfer.playPause()
      // This is because we want the time to be the duration of the audio when they stop recording,
      // but once they start playing it, we want it to be the current time. So, once they start playing it
      // we'll start keeping track of the playback time from that point onwards (until re-recording).
      setShouldUpdatePlaybackTime(true)
    }
  }, [wavesurfer])

  const startRecording = useCallback(() => {
    if (!recordPlugin || !activeAudioDeviceId || !wavesurfer) {
      return
    }

    wavesurfer.setOptions({
      waveColor: theme.colors.primary,
    })

    if (recordingUrl) {
      handleClear({ updateWidgetManager: false })
    }

    recordPlugin.startRecording({ deviceId: activeAudioDeviceId }).then(() => {
      // Update the record button to show the user that they can stop recording
      forceRerender()
    })
  }, [
    activeAudioDeviceId,
    recordPlugin,
    theme,
    wavesurfer,
    recordingUrl,
    handleClear,
  ])

  const stopRecording = useCallback(() => {
    if (!recordPlugin) return

    recordPlugin.stopRecording()

    wavesurfer?.setOptions({
      // We are blending this color instead of directly using the theme color (fadedText40)
      // because the "faded" part of fadedText40 means introducing some transparency, which
      // causes problems with the progress waveform color because wavesurfer is choosing to
      // tint the waveColor with the progressColor instead of directly setting the progressColor.
      // This means that the low opacity of fadedText40 causes the progress waveform to
      // have the same opacity which makes it impossible to darken it enough to match designs.
      // We fix this by blending the colors to figure out what the resulting color should be at
      // full opacity, and we usee that color to set the waveColor.
      waveColor: blend(
        theme.colors.fadedText40,
        theme.genericColors.secondaryBg
      ),
    })
  }, [recordPlugin, wavesurfer, theme])

  const isRecording = Boolean(recordPlugin?.isRecording())
  const isPlaying = Boolean(wavesurfer?.isPlaying())

  const isPlayingOrRecording = isRecording || isPlaying
  const showPlaceholder = !isRecording && !recordingUrl && !hasNoMicPermissions

  const showNoMicPermissionsOrPlaceholder =
    hasNoMicPermissions || showPlaceholder

  return (
    <StyledAudioInputContainerDiv
      className="stAudioInput"
      data-testid="stAudioInput"
    >
      <WidgetLabel
        label={element.label}
        disabled={hasNoMicPermissions}
        labelVisibility={labelVisibilityProtoValueToEnum(
          element.labelVisibility?.value
        )}
      ></WidgetLabel>
      <StyledWaveformContainerDiv>
        <Toolbar
          isFullScreen={false}
          disableFullscreenMode={true}
          target={StyledWaveformContainerDiv}
        >
          {deleteFileUrl && (
            <ToolbarAction
              label="Clear recording"
              icon={Delete}
              onClick={() => handleClear({ updateWidgetManager: true })}
              data-testid="stAudioInputClearRecordingButton"
            />
          )}
        </Toolbar>
        <AudioInputActionButtons
          isRecording={isRecording}
          isPlaying={isPlaying}
          recordingUrlExists={Boolean(recordingUrl)}
          startRecording={startRecording}
          stopRecording={stopRecording}
          onClickPlayPause={onClickPlayPause}
          disabled={disabled || hasNoMicPermissions}
        />
        <StyledWaveformInnerDiv>
          {showPlaceholder && <Placeholder />}
          {hasNoMicPermissions && <NoMicPermissions />}
          <StyledWaveSurferDiv
            ref={waveSurferRef}
            show={!showNoMicPermissionsOrPlaceholder}
          />
        </StyledWaveformInnerDiv>
        <StyledWaveformTimeCode
          isPlayingOrRecording={isPlayingOrRecording}
          data-testid="stAudioInputWaveformTimeCode"
        >
          {shouldUpdatePlaybackTime ? progressTime : recordingTime}
        </StyledWaveformTimeCode>
      </StyledWaveformContainerDiv>
    </StyledAudioInputContainerDiv>
  )
}

export default memo(AudioInput)
