# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
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

from datetime import datetime, time

import streamlit as st
from streamlit import runtime

w1 = st.time_input("Time input 1 (8:45)", time(8, 45))
st.write("Value 1:", w1)

w2 = st.time_input(
    "Time input 2 (21:15, help)", datetime(2019, 7, 6, 21, 15), help="Help text"
)
st.write("Value 2:", w2)

w3 = st.time_input("Time input 3 (disabled)", time(8, 45), disabled=True)
st.write("Value 3:", w3)

w4 = st.time_input(
    "Time input 4 (hidden label)", time(8, 45), label_visibility="hidden"
)
st.write("Value 4:", w4)

w5 = st.time_input(
    "Time input 5 (collapsed label)", time(8, 45), label_visibility="collapsed"
)
st.write("Value 5:", w5)

if runtime.exists():

    def on_change():
        st.session_state.time_input_changed = True
        st.text("Time input callback triggered")

    st.time_input(
        "Time input 6 (with callback)",
        time(8, 45),
        key="time_input6",
        on_change=on_change,
    )

    st.write("Value 6:", st.session_state.time_input6)
    st.write("time input changed:", st.session_state.get("time_input_changed") is True)
    # Reset to False:
    st.session_state.time_input_changed = False

w7 = st.time_input("Time input 7 (step=60)", time(8, 45), step=60)
st.write("Value 7:", w7)


w8 = st.time_input("Time input 8 (empty)", value=None)
st.write("Value 8:", w8)
