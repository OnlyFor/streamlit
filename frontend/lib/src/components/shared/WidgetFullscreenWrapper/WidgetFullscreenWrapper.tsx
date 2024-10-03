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
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useTheme } from "@emotion/react"

import { StyledFullScreenFrame } from "@streamlit/lib/src/components/shared/FullScreenWrapper/styled-components"
import { WidgetFullscreenContext } from "@streamlit/lib/src/components/shared/WidgetFullscreenWrapper"
import { WindowDimensionsContext } from "@streamlit/lib/src/components/shared/WindowDimensions"
import { useRequiredContext } from "@streamlit/lib/src/hooks/useRequiredContext"
import { EmotionTheme } from "@streamlit/lib/src/theme"

export type WidgetFullscreenWrapperProps = PropsWithChildren<{
  height?: number
  width: number
}>

export const WidgetFullscreenWrapper: FC<WidgetFullscreenWrapperProps> = ({
  children,
  height,
  width,
}) => {
  const theme: EmotionTheme = useTheme()
  const [expanded, setExpanded] = useState(false)
  const { fullHeight, fullWidth } = useRequiredContext(WindowDimensionsContext)

  const zoomIn = useCallback(() => {
    document.body.style.overflow = "hidden"
    setExpanded(true)
  }, [])

  const zoomOut = useCallback(() => {
    document.body.style.overflow = "unset"
    setExpanded(false)
  }, [])

  const controlKeys = useCallback(
    (event: KeyboardEvent) => {
      // Your logic for handling keydown events
      if (event.keyCode === 27 && expanded) {
        // Exit fullscreen
        zoomOut()
      }
    },
    [zoomOut, expanded]
  )

  useEffect(() => {
    document.addEventListener("keydown", controlKeys, false)

    return () => {
      document.removeEventListener("keydown", controlKeys, false)
    }
  }, [controlKeys])

  const fullscreenContextValue = useMemo(() => {
    return {
      width: expanded ? fullWidth : width,
      height: expanded ? fullHeight : height,
      expanded,
      expand: zoomIn,
      collapse: zoomOut,
    }
  }, [expanded, fullHeight, fullWidth, height, width, zoomIn, zoomOut])

  return (
    <WidgetFullscreenContext.Provider value={fullscreenContextValue}>
      <StyledFullScreenFrame
        isExpanded={expanded}
        data-testid="stFullScreenFrame"
        theme={theme}
      >
        {children}
      </StyledFullScreenFrame>
    </WidgetFullscreenContext.Provider>
  )
}
