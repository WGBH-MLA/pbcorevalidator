#!/bin/bash

if [[ $(/usr/sbin/lsof -ti :4567) ]]; then
    echo "Server already running... Cool!"
else
    echo "Starting reg Server"
    # cd /var/app/album-timeline && . ~/.nvm/nvm.sh && nohup node backend.js 0<&- &>/home/ec2-user/boot-log.log &
    cd /var/app/pbcorevalidator && RAILS_ENV=production nohup bundle exec ruby sinatra-dispatch.rb 0<&- &>>/home/ec2-user/boot-log.log &
    echo "I rly deed it"
fi
