# PBCore Validator, Validator class
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

require 'libxml'

# A class to validate PBCore documents.
class Validator
  include LibXML #:nodoc:

  # The PBCore namespace
  PBCORE_NAMESPACE = "http://www.pbcore.org/PBCore/PBCoreNamespace.html"

  # List of supported XSDs
  PBCORE_VERSIONS = {
#    "1.1" => { :version => "PBCore 1.1", :xsd => "PBCoreXSD_Ver_1-1_Final.xsd" },
    "2.1" => { :version => "PBCore 2.1", :xsd => "pbcore-2.1.xsd" },
    "2.0" => { :version => "PBCore 2.0", :xsd => "PBCoreXSD_v2.xsd" },
    "1.2" => { :version => "PBCore 1.2", :xsd => "PBCoreSchema_v1-2.xsd" },
    "1.2.1" => { :version => "PBCore 1.2.1", :xsd => "PBCoreXSD_Ver_1-2-1.xsd" },
    "1.3" => { :version => "PBCore 1.3", :xsd => "PBCoreXSD-v1.3.xsd" }
  }.freeze

  # A set of predefined value lists, which are recommended in various circumstances.
  module Picklists
    ASSET_TYPES = [
      "Album", "Animation", "Clip", "Collection", "Compilation", "Episode",
      "Miniseries", "Program", "Promo", "Raw Footage", "Segment", "Series",
      "Season", "Subseries"
    ]

    DATE_TYPES = [
      "accepted", "available", "available end", "available start", "broadcast",
      "captured", "created", "copyright", "deletion", "digitized", "distributed",
      "dubbed", "edited", "encoded", "encrypted", "event", "ingested", "issued",
      "issued", "licensed", "mastered", "migrated", "mixed", "modified",
      "normalized", "performed", "podcast", "published", "released", "restored",
      "transferred", "valid", "validated", "webcast"
    ]

    TITLE_TYPES = [
      "Album", "Collection", "Episode", "Miniseries", "Program", "Segment", "Series",
      "Subseries"
    ]

    DESCRIPTION_TYPES = [
     "Abstract", "Awards", "Chapter", "Collection", "Comments", "Description",
     "Episode Description", "Event", "Excerpt", "Item", "Movement", "Number",
     "Playlist", "Program", "Reviews", "Rundown", "Script", "Shot List",
     "Segment", "Series", "Song", "Story", "Summary", "Transcript"
    ]

    RELATION_TYPES = [
      "Has Derivative", "Derived From", "References", "Is Referenced By",
      "Is Part Of", "Has Part", "Has Version", "Is Version Of", "Is Clone Of",
      "Cloned To", "Is Dub Of", "Dubbed To", "Is Format Of", "Has Format",
      "Replaces", "Is Replaced By"
    ]

    COVERAGE_TYPES = [
      "Spatial", "Temporal"
    ]

    ROLES = [
      "Actor", "Artist", "Artistic Director", "Associate Producer", "Author",
      "Broadcast Engineer", "Camera Operator", "Caption Writer",
      "Casting Director", "Choreographer", "Cinematographer", "Co-Producer",
      "Commentator", "Composer", "Concept Artist", "Conductor",
      "Costume Designer", "Describer", "Director", "Director of Photography",
      "Editor", "Executive Producer", "Filmmaker", "Foley Artist",
      "Graphic Designer", "Graphic Editor", "Guest", "Host", "Interviewee",
      "Interviewer", "Lighting Technician", "Make-Up Artist", "Moderator",
      "Music Supervisor", "Musician", "Narrator", "Panelist", "Performer",
      "Performing Group", "Photographer", "Producer", "Production Unit",
      "Recording Engineer", "Reporter", "Sound Designer", "Sound Editor",
      "Set Designer", "Speaker", "Technical Director", "Video Engineer",
      "Vocalist", "Voiceover Artist", "Writer"
    ]

    PUBLISHER_ROLES = [
      "Distributor", "Presenter", "Publisher"
    ]

    PHYSICAL_FORMATS = [
      "Open reel audiotape", "Grooved analog disc", "1 inch audio tape",
      "1/2 inch audio tape", "1/4 inch audio cassette", "1/4 inch audio tape",
      "2 inch audio tape", "8-track", "Aluminum disc", "Audio cassette",
      "Audio CD", "DAT", "DDS", "DTRS", "Flexi Disc", "Grooved Dictabelt",
      "Lacquer disc", "Magnetic Dictabelt", "Mini-cassette", "PCM Betamax",
      "PCM U-matic", "PCM VHS", "Piano roll", "Plastic cylinder", "Shellac disc",
      "Super Audio CD", "Wax cylinder", "Vinyl recording", "Film", "8mm film",
      "9.5mm film", "Super 8mm film", "16mm film", "Super 16mm film", "22mm film",
      "28mm film", "35mm film", "70mm film", "Videocassette",
      "Open reel videotape", "Optical video disc", "1 inch videotape",
      "1/2 inch videotape", "1/4 inch videotape", "2 inch videotape", "Betacam",
      "Betamax", "Blu-ray disc", "Cartrivision", "D1", "D2", "D3", "D5", "D6",
      "D9", "DCT", "Digital Betacam", "Digital8", "DV", "DVCAM", "DVCPRO", "DVD",
      "EIAJ", "EVD", "HDCAM", "HDV", "Hi8", "LaserDisc", "MII", "MiniDV",
      "Super Video CD", "U-matic", "Universal Media Disc", "V-Cord", "VHS",
      "Video8", "VX"
      ]

    MEDIA_TYPES = [
		"Moving Image", "MovingImage", "Audio"
	]

    GENERATIONS = [
      "A-B rolls", "Answer print", "Composite", "Copy", "Copy: Access", "Dub",
      "Duplicate", "Fine cut", "Intermediate", "Kinescope", "Line cut",
      "Line cut", "Magnetic track", "Master", "Master: production",
      "Master: distribution", "Mezzanine", "Negative", "Optical track",
      "Original", "Original footage", "Original recording", "Outs and trims",
      "Picture lock", "Positive", "Preservation", "Print", "Proxy file",
      "Reversal", "Rough cut", "Separation master", "Stock footage",
      "Submaster", " Transcription disc", "Work print", "Work tapes",
      "Work track"
    ]
  end

  # returns the LibXML::XML::Schema object of the PBCore schema
  def self.schema(pbcore_version)
    @@schemas ||= {}
    @@schemas[pbcore_version] ||= XML::Schema.document(XML::Document.file(File.join(File.dirname(__FILE__), "..", "data", PBCORE_VERSIONS[pbcore_version][:xsd])))
  end

  # creates a new PBCore validator object, parsing the provided XML.
  #
  # io_or_document can either be an IO object or a String containing an XML document.
  def initialize(io_or_document, pbcore_version = "2.1", options)
    XML.default_line_numbers = true
    @options = options

    # best_practices is hash to record line numbers - it will be converted to array once we have the full best_practices error list
    @errors = {best_practices: {}, xml: [], fail: [], vocabs: []}
    @pbcore_version = pbcore_version
    set_rxml_error do
      @xml = io_or_document.respond_to?(:read) ?
        XML::Document.io(io_or_document) :
        XML::Document.string(io_or_document)
    end

  end

  # checks the PBCore document against the XSD schema
  def checkschema
    return if @schema_checked || @xml.nil?

    @schema_checked = true
    set_rxml_error do
      @xml.validate_schema(Validator.schema(@pbcore_version))
    end
  end

  def checkvocabs
    check_picklist('assetType', Picklists::ASSET_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/.')
    check_picklist('dateType', Picklists::DATE_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/datetype-vocabulary/.', true)
    check_picklist('titleType', Picklists::TITLE_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/titletype-vocabulary/.', true)
    check_lists('subject')
    check_picklist('descriptionType', Picklists::DESCRIPTION_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/descriptiontype-vocabulary/.', true)
    check_picklist('relationType', Picklists::RELATION_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/pbcorerelationtype-vocabulary/ and http://pbcore.org/pbcore-controlled-vocabularies/instatiationrelationtype-vocabulary/')
    check_picklist('creatorRole', Picklists::ROLES , 'http://pbcore.org/pbcore-controlled-vocabularies/creatorrole-and-contributorrole-vocabulary/.')
    check_picklist('contributorRole', Picklists::ROLES , 'http://pbcore.org/pbcore-controlled-vocabularies/creatorrole-and-contributorrole-vocabulary/.')
    check_picklist('publisherRole', Picklists::PUBLISHER_ROLES , 'http://pbcore.org/pbcore-controlled-vocabularies/publisherrole-vocabulary/.')
    check_picklist('formatPhysical', Picklists::PHYSICAL_FORMATS , 'Audio: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-audio-vocabulary/, Film: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-film-vocabulary/. and Video: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-video-vocabulary/.')
    check_picklist('instantiationPhysical', Picklists::PHYSICAL_FORMATS , 'Audio: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-audio-vocabulary/, Film: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-film-vocabulary/. and Video: http://pbcore.org/pbcore-controlled-vocabularies/instantiationphysical-video-vocabulary/.')
    check_picklist('formatMediaType', Picklists::MEDIA_TYPES , 'http://pbcore.org/pbcore-controlled-vocabularies/instantiationmediatype-vocabulary/.')
    check_picklist('instantiationMediaType', Picklists::MEDIA_TYPES, 'http://pbcore.org/pbcore-controlled-vocabularies/instantiationmediatype-vocabulary/.')
    check_picklist('coverageType', Picklists::COVERAGE_TYPES)
  end

  # check for things which are not errors, exactly, but which are not really good ideas either.
  #
  # this is subjective, of course.
  def checkbestpractices
#    check_names('creator')
#    check_names('contributor')
#    check_names('publisher')
    check_only_one_format

    check_min_one_subelements('pbcoreCollection',['pbcoreDescriptionDocument'],"")
    ['pbcoreDescriptionDocument','pbcorePart'].each do |parentname| check_min_one_subelements(parentname,['pbcoreIdentifier','pbcoreTitle','pbcoreDescription'],"") ; end ;

    check_element_has_attribute('pbcoreIdentifier','source',"")

#     check_min_one_subelements('pbcoreRelation',['pbcoreRelationType','pbcoreRelationIdentifier'],"")
#     check_max_one_subelements('pbcoreRelation',['pbcoreRelationIdentifier','pbcoreRelationType'],"")
    ['pbcoreRelationType','pbcoreRelationIdentifier'].each do |subname| check_only_one_subelement('pbcoreRelation',subname.split(),"must contain two subelements and only one '#{subname}.'  Please repeat the entire 'pbcoreRelation' container element to express each relationship.") ; end ;

    check_only_one_subelement('pbcoreCoverage',['coverage'],"should contain only one 'coverage' subelement.  Please repeat the entire pbcoreCoverage container element for each instance of coverage.")

    check_only_one_subelement('pbcoreCreator',['creator'],"should contain only one 'creator' subelement.  Please repeat the entire pbcoreCreator container element for each instance of creator.")
    check_only_one_subelement('pbcoreContributor',['contributor'],"should contain only one 'contributor' subelement.  Please repeat the entire pbcoreContributor container element for each instance of contributor.")
    check_only_one_subelement('pbcorePublisher',['publisher'],"should contain only one 'publisher' subelement.  Please repeat the entire pbcorePublisher container element for each instance of publisher.")
    check_only_one_subelement('pbcoreRightsSummary',['rightsSummary', 'rightsLink','rightsEmbedded'],"should contain only one subelement.  Please repeat the entire pbcoreRightsSummary container element for each rightsSummary, rightsLink, or rightsEmbedded.")
    ['pbcoreInstantiationDocument','instantiationPart'].each do |parentname| check_min_one_subelements(parentname,['instantiationIdentifier','instantiationLocation'],"") ; end ;
    check_element_has_attribute('instantiationIdentifier','source',"")
    ['pbcoreInstantiationDocument','instantiationPart'].each do |parentname| check_max_one_subelements(parentname,['instantiationPhysical','instantiationDigital','instantiationStandard','instantiationLocation','instantiationMediaType','instantiationFileSize','instantiationTimeStart','instantiationDuration','instantiationDataRate','instantiationColors','instantiationTracks','instantiationChannelConfiguration','instantiationChannelConfiguration'],"") ; end ;

    check_only_one_subelement('instantiationRights',['rightsSummary', 'rightsLink','rightsEmbedded'],"should contain only one subelement.  Please repeat the entire instantiationRights container element for each rightsSummary, rightsLink, or rightsEmbedded.")

  	['pbcoreExtension','instantiationExtension'].each do |parentname| check_only_one_subelement(parentname,['extensionWrap','extensionEmbedded'],"should contain only one subelement.  Please repeat the entire '#{parentname}' container element for each 'extensionWrap' or 'extensionEmbedded'") ; end ;
  	['extensionElement','extensionValue'].each do |subname|  check_only_one_subelement('extensionWrap',subname.split(),"must contain one '#{subname}' subelement.") ; end ;


    check_valid_characters(['instantiationFileSize', 'instantiationDataRate', 'essenceTrackDataRate', 'essenceTrackFrameRate', 'essenceTrackPlaybackSpeed', 'essenceTrackSamplingRate', 'essenceTrackBitDepth', 'essenceTrackFrameSize', 'essenceTrackAspectRatio'],"g/[0-9]:x.\///", msg = "For best practice, this technical element should only contain numeric values. To express a unit of measure for this element, we recommend using the @unitsOfMeasure attribute.")
    
    check_valid_characters(['instantiationTimeStart', 'instantiationDuration', 'essenceTrackTimeStart', 'essenceTrackDuration'],"g/[0-9]:;\.//", msg = "Best practice is to use a timestamp format for this element, such as HH:MM:SS:FF or HH:MM:SS.mmm or S.mmm.")
    
    check_date(['pbcoreAssetDate', 'instantiationDate'])

    check_valid_length_codes(['instantiationLanguage', 'essenceTrackLanguage'], ';', "Best practice is to use one of the ISO 639.2 or 639.3 standard language codes, which can be found at http://www.loc.gov/standards/iso639-2/ and http://www-01.sil.org/iso639-3/codes.asp. You can describe more than one language in the element by separating two three-letter codes with a semicolon, i.e. eng;fre.")

    # put em in order
    @errors[:best_practices] = @errors[:best_practices].keys.sort.map {|line_num| @errors[:best_practices][line_num] }.flatten
  end

  # returns true iff the document is perfectly okay
  def valid?
    !@errors || (@errors[:xml].empty? && @errors[:best_practices].empty? && @errors[:vocabs].empty? && @errors[:fail].empty?)
  end

  # returns true iff the document is at least some valid form of XML
  def valid_xml?
    !(@xml.nil?)
  end

  # returns a list of perceived errors with the document.
  def errors
    # fatal parse error gets rescued but there ain't no elements!! save our bacon here
    return @errors if @errors[:xml] && @errors[:xml].count > 0
    checkschema
    checkvocabs if @options[:vocabs]
    checkbestpractices if @options[:best_practices] && @pbcore_version != "2.0"
    @errors.clone
  end

  protected
  # Runs some code with our own LibXML error handler, which will record
  # any seen errors for later retrieval.
  #
  # If no block is given, then our error handler will be installed but the
  # caller is responsible for resetting things when done.
  def set_rxml_error
    XML::Error.set_handler{|err| self.rxml_error(err)}
    if block_given?
      begin
        yield
      rescue XML::Error
        # we don't have to do anything, because LibXML throws exceptions after
        # already passing them to the selected handler. kind of strange.
      end
      XML::Error.reset_handler
    end
  end

  def rxml_error(err) #:nodoc:
    @errors[:xml] << err
  end

  private

  def add_to_line_num_hash(node, error)
    @errors[:best_practices][node.line_num] ||= []
    @errors[:best_practices][node.line_num] << error
  end

  def check_picklist(elt, picklist, msg = "", attribute=false)
    search_method = attribute ? :each_attr : :each_elt

    send(search_method, elt) do |node|
      value_to_test = attribute ? node.attributes.get_attribute(elt).value : node.content
      if value_to_test.strip.empty?
        @errors[:vocabs] << "#{elt} on #{node.line_num} is empty. Perhaps consider leaving that element out instead."
      elsif picklist.none?{|i| i.downcase == value_to_test.downcase}
        @errors[:vocabs] << "“#{value_to_test}” on line #{node.line_num} is not in the PBCore suggested controlled vocabulary for #{elt}. While that is valid, you may want to see if there is an appropriate term in the vocabulary here: " + msg.to_s
      end
    end
    check_lists(elt)
  end

  def check_lists(elt)
    each_elt(elt) do |node|
      if node.content =~ /[,|;]/
        add_to_line_num_hash(node, "In #{elt} on line #{node.line_num}, you have entered “#{node.content}”, which looks like it may be a list. It is preferred instead to repeat the containing element.")
      end
    end
  end
  # ensure that no single instantiation has both a formatDigital and a formatPhysical
  def check_only_one_format
    each_elt("pbcoreInstantiation") do |node|
      if node.find(".//pbcore:formatDigital", "pbcore:#{PBCORE_NAMESPACE}").size > 0 &&
          node.find(".//pbcore:formatPhysical", "pbcore:#{PBCORE_NAMESPACE}").size > 0
        add_to_line_num_hash(node, "It looks like the instantiation on line #{node.line_num} contains both a formatDigital and a formatPhysical element. This is valid, but not recommended in PBCore XML.")
      end
      if node.find(".//pbcore:instantiationDigital", "pbcore:#{PBCORE_NAMESPACE}").size > 0 &&
          node.find(".//pbcore:instantiationPhysical", "pbcore:#{PBCORE_NAMESPACE}").size > 0
        add_to_line_num_hash(node, "It looks like the instantiation on line #{node.line_num} contains both a instantiationDigital and a instantiationPhysical element. This is valid, but not recommended in PBCore XML.")
      end
    end
  end

  def check_element_has_attribute(elementname,attributename,msg="")
    each_elt(elementname.to_s) do |node|
      isMissing=true
      node.attributes.each {|attribute| isMissing=false if attribute.name == attributename }
      # node.attributes.get_attribute(attributename)
      if isMissing
        add_to_line_num_hash(node, "Element '#{elementname}' at line #{node.line_num} must contain the attribute '#{attributename}' #{msg.to_s}")
      end
    end
  end

  def check_only_one_subelement(parentname,subnames,msg = "")
#    subsum=0
    each_elt(parentname.to_s) do |node|
        subsum=0
    	subnames.each do |subname|
  			subsum = subsum + node.find("./pbcore:#{subname}", "pbcore:#{PBCORE_NAMESPACE}").size
  		end
  		if subsum != 1
  			add_to_line_num_hash(node, "Element '#{parentname}' near line #{node.line_num} #{msg.to_s}")
  		end
  	end
  end

  def check_max_one_subelements(parentname,subnames,msg = "")
    each_elt(parentname.to_s) do |node|
    	subnames.each do |subname|
  			subsum = node.find("./pbcore:#{subname}", "pbcore:#{PBCORE_NAMESPACE}").size
  			if subsum > 1
  				add_to_line_num_hash(node, "Element '#{subname}' near line #{node.line_num} isn’t repeatable. For valid PBCore, please find another way to incorporate that information.  #{msg.to_s}")
  			end
  		end
  	end
  end

  def check_min_one_subelements(parentname,subnames,msg = "")
  	each_elt(parentname.to_s) do |node|
  		subnames.each do |subname|
  			subsum = node.find("./pbcore:#{subname}", "pbcore:#{PBCORE_NAMESPACE}").size
  			if subsum < 1
  				add_to_line_num_hash(node, "Element '#{parentname}' near line #{node.line_num} is missing required subelement '#{subname}.'  For valid PBCore, please add a value for this element. #{msg.to_s}")
  			end
  		end
  	end
  end

  def check_valid_characters(elements_array,validstring = "", msg = "")
    elements_array.each do |elt|
  		each_elt(elt.to_s) do |node|
  			if node.content.tr(validstring,"") != ""
  				add_to_line_num_hash(node, "Element '#{node.name}' at line #{node.line_num} contains unexpected #{node.content.tr(validstring,"").length} characters. #{msg.to_s}")
  			end
  		end
  	end
  end

  def check_date(elements_array)
    elements_array.each do |elt|
      each_elt(elt.to_s) do |node|
        unless node.content.match(/\A\d{4}\-\d{1,2}\-\d{1,2}\z|\A\d{4}\-\d{1,2}\z|\A\d{4}\z/)
          add_to_line_num_hash(node, "Element '#{node.name}' at line #{node.line_num}: The recommended formats for date fields are: YYYY-MM-DD, YYYY-MM, and YYYY.")
        end
      end
    end
  end

  def check_valid_length_codes(elements_array, delimiter = ';' ,msg = "")
    elements_array.each do |elt|
  		each_elt(elt.to_s) do |node|
  			xcount=node.content.split(delimiter).select{|x| x.length < 2 || x.length > 3}.length
  			if xcount != 0
  				add_to_line_num_hash(node, "Element '#{node.name}' at line #{node.line_num} contains #{xcount} unexpected value#{'s' if xcount > 1}. #{msg.to_s}")
  			end
  		end
  	end
  end


  def each_elt(elt)
    @xml.find("//pbcore:#{elt}", "pbcore:#{PBCORE_NAMESPACE}").each do |node|
      yield node
    end
  end

  def each_attr(attr)
    @xml.find("//*[@#{attr}]", "pbcore:#{PBCORE_NAMESPACE}").each do |node|
      yield node
    end
  end
end
