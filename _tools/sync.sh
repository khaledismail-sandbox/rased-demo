#!/bin/bash
# Mirror the publishable site into the scratchpad (preview server can't read ~/Desktop).
rsync -a --delete --exclude _reference --exclude _tools --exclude .claude ~/Desktop/rased-demo/ /private/tmp/claude-501/-Users-khaledismail--claude-spares-spare-NTwPkX/5d2e490c-4e7c-48fc-a7b6-139ce830bbe1/scratchpad/mirror/rased-demo/
