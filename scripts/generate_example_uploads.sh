#!/bin/sh

set -e

working_dir=$(pwd)
project_dir=$(dirname $(dirname $(realpath $0)))
REMOTE_TOOLS_PATH=$working_dir/dependencies/nomad-remote-tools-hub/docker/

cd $project_dir/examples/data

rm -rf uploads/*.zip

zip -r -j uploads/theory.zip theory/*
zip -r -j uploads/eln.zip eln/*
zip -r -j uploads/tabular.zip tabular/*

zip -r -j uploads/apm.zip apm/*
zip -r -j uploads/mpes.zip $REMOTE_TOOLS_PATH/mpes/example/*
zip -r -j uploads/ellips.zip $REMOTE_TOOLS_PATH/ellips/example/*
zip -r -j uploads/em_spctrscpy.zip em_spctrscpy/*
zip -r -j uploads/iv_temp.zip iv_temp/*
zip -r -j uploads/xps.zip $REMOTE_TOOLS_PATH/xps/example/*
zip -r -j uploads/sts.zip $REMOTE_TOOLS_PATH/sts/example/*
