# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import streamlit as st

audio1 = st.audio_input(label="Audio Input 1", key="the_audio_input")
st.audio(audio1)
st.write("Audio Input 1:", bool(audio1))


audio_input_from_form = None

with st.form(key="my_form", clear_on_submit=True):
    audio_input_from_form = st.audio_input(label="Audio Input in Form")
    st.form_submit_button("Submit")

st.write("Audio Input in Form:", audio_input_from_form)


@st.experimental_fragment()
def test_fragment():
    audio_input_from_fragment = st.audio_input(label="Audio Input in Fragment")
    st.write("Audio Input in Fragment:", audio_input_from_fragment)


test_fragment()

if "runs" not in st.session_state:
    st.session_state.runs = 0
st.session_state.runs += 1
st.write("Runs:", st.session_state.runs)
