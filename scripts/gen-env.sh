#!/bin/bash
r(){ openssl rand -base64 24 | tr -d '/+=' | cut -c1-24; }
sed -e "s/MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$(r)/" \
    -e "s/DB_PASSWORD=.*/DB_PASSWORD=$(r)/" \
    -e "s/EXPORTER_PASSWORD=.*/EXPORTER_PASSWORD=$(r)/" \
    -e "s/GF_ADMIN_PASSWORD=.*/GF_ADMIN_PASSWORD=$(r)/" \
    -e "s/SESSION_SECRET=.*/SESSION_SECRET=$(r)/" .env.example > .env
chmod 600 .env && echo ".env đã tạo"
