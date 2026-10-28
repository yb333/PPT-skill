#!/usr/bin/env sh
# deck-studio 一键安装（mac/linux 入口）
cd "$(dirname "$0")" || exit 1
exec node install.mjs "$@"
