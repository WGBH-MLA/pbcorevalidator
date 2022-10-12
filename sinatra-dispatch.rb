#!/usr/bin/ruby
# -*- coding: utf-8 -*-

# PBCore Validator, sinatra wrapper
# Copyright © 2009 Roasted Vermicelli, LLC
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


require 'sinatra'
require_relative './lib/validator'
require 'haml'

get '/' do
  haml :index
end

get '/validator' do
  "Sorry, only POST is supported."
end

post '/validator' do
  version = params[:version]

  unless (version && Validator::PBCORE_VERSIONS[version])
    @errors = {}
    @errors[:fail] = ["You must select a PBCore version to validate against."]
  end

  if params[:file] && params[:file][:tempfile] && params[:file][:tempfile].size > 0
    input = params[:file][:tempfile]
  elsif !params[:textarea].strip.empty?
    input = params[:textarea]
  else
    @errors = {}
    @errors[:fail] = []
    @errors[:fail] << "You must provide a PBCore document either by file upload or by pasting into the textarea."
  end

  if input
    @validator = Validator.new(input, version, {best_practices: params[:best_practices], vocabs: params[:vocabs]})
  end

  @errors = @validator.errors unless @errors

  haml :validator
end

get '/css' do
  content_type "text/css", :charset => "utf-8"
  response['Cache-Control'] = 'public, max-age=7200'
  sass :style
end
