#!/bin/bash
# usage: head.sh <root> <page-kind> <title> [extra-script ...] — prints the shared <head>
R="$1"; K="$2"; T="$3"; shift 3
cat <<H
<!doctype html>
<html lang="en" data-page="$K" data-root="$R">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>$T</title>
<link rel="icon" href="${R}assets/img/logo.png">
<link rel="stylesheet" href="${R}assets/css/tokens.css">
<link rel="stylesheet" href="${R}assets/css/site.css">
<!-- Analytics + Session Replay + Experiment (unified loader) -->
<script src="https://cdn.amplitude.com/script/ad85aaa13604f0cb6816af5141d8b190.js"></script>
<!-- Guides & Surveys -->
<script src="https://cdn.amplitude.com/script/ad85aaa13604f0cb6816af5141d8b190.engagement.js"></script>
<script src="${R}assets/js/analytics.js"></script>
H
for s in "$@"; do echo "<script src=\"${R}assets/js/$s\"></script>"; done
echo "</head>"
