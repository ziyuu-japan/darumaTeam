#!/bin/bash
tempfile=`tempfile`
option="-m /usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice \
	-x /var/lib/mecab/dic/open-jtalk/naist-jdic \
	-ow $tempfile"
 
echo "$1" | open_jtalk $option
aplay -q $tempfile
echo $tempfile
