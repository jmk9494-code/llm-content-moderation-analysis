#!/bin/bash
# Render sets the PORT environment variable.
# Streamlit needs to be told to listen on that port and 0.0.0.0
echo "Starting Streamlit on port $PORT"
streamlit run app.py --server.port $PORT --server.address 0.0.0.0
