#!/bin/bash

# 1. Get ViewState and EventValidation from initial page
PAGE=$(curl -s 'https://apps.education-ni.gov.uk/appinstitutes/default.aspx')
VIEWSTATE=$(echo "$PAGE" | sed -n 's/.*id="__VIEWSTATE" value="\([^"]*\)".*/\1/p' | head -1)
EVENTVALIDATION=$(echo "$PAGE" | sed -n 's/.*id="__EVENTVALIDATION" value="\([^"]*\)".*/\1/p' | head -1)

# URL encode
VIEWSTATE_ENC=$(echo -n "$VIEWSTATE" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")
EVENTVALIDATION_ENC=$(echo -n "$EVENTVALIDATION" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")

# 2. Export data with minimal payload
curl 'https://apps.education-ni.gov.uk/appinstitutes/default.aspx' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-raw "__EVENTTARGET=ctl00%24ContentPlaceHolder1%24lvSchools%24btnDoExport&__VIEWSTATE=${VIEWSTATE_ENC}&__VIEWSTATEENCRYPTED=&__EVENTVALIDATION=${EVENTVALIDATION_ENC}&ctl00%24ContentPlaceHolder1%24instType=-1&ctl00%24ContentPlaceHolder1%24instStatus=0&ctl00%24ContentPlaceHolder1%24lvSchools%24exportType=2" 
