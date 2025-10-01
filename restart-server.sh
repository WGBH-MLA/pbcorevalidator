#!/bin/bash

if [[ /usr/sbin/lsof -ti :4567 ]]; then
    echo "Server already running... Cool!"
else
    echo "Starting reg Server"
    cd /var/app/pbcorevalidator && [[ -s "$HOME/.rvm/scripts/rvm" ]] && source "$HOME/.rvm/scripts/rvm" && rvm use 3.1.4 && RAILS_ENV=production nohup bundle exec ruby sinatra-dispatch.rb 0<&- &>>/home/ec2-user/boot-log.log &
    echo "I rly deed it"
fi
