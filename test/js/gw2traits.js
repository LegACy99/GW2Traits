gw2traits = function() {
	//Class variables
	var m_Traits			= {};
	var m_MapCount 			= {};
	var m_MapLevels			= {};
	var m_Acquisitions		= {};
	var m_MaxLevel			= 80;
	var m_TooltipHandler	= function(){};

	var initialize = function(tooltip) {
		//Save callback
		m_TooltipHandler = tooltip;

		//Initialize
		Parse.initialize("SDiJ7OLjISzQIt2RTOgQOTlCh8Nj0xPHwm17Isq2", "mkJfAEKHWnCkUgFT7a2Z7Btf0PGoUdBZzMbtqLTd");
		loadCookies();
	};

	var loadTraits = function() {
		//Query all traits
		var TraitObject = Parse.Object.extend("Trait");
		var TraitQuery	= new Parse.Query(TraitObject);	
		TraitQuery.ascending("createdAt");
		TraitQuery.include("map");
		TraitQuery.find({
			success: function(traits) {
				//Initialize
				var Tier 		= 0;
				var Column		= 0;
				var TraitList 	= "";
				var TierCounts	= [ 6, 10, 13 ];

				//For each result
				for (var i = 0; i < traits.length; i++) {
					//Check tier
					if (Column >= TierCounts[Tier]) {
						//Increase tier
						Tier++;
						if (Tier >= TierCounts.length) {
							//Reset
							Tier 	= 0;
							Column	= 0;
						}
					}

					//Initialize trait data
					var ID = traits[i].id;
					if (m_Traits[ID] == null) m_Traits[ID] = {};

					//Save data
					console.log("line " + traits[i].get("line") + " number " + traits[i].get("number"));
					m_Traits[ID]["number"]		= traits[i].get("number");
					m_Traits[ID]["acquisition"] = traits[i].get("acquisition").id;
					if (m_Traits[ID]["unlock"] == null) m_Traits[ID]["unlock"] = false;

					//Get map
					var Map = traits[i].get("map");
					if (Map != null) {
						//Save
						var MapName 			= Map.get("name");
						m_MapLevels[MapName]	= Map.get("minLevel");
						m_Traits[ID]["map"] 	= MapName;

						//Extend string
						//TraitList += " at " + MapName;
					}

					//If opener
					if (Column == 0) TraitList += '<div class="trait-row">';
					if (Column == 0 || Column == TierCounts[0] || Column == TierCounts[1]) TraitList += '<div class="trait-box">';

					//Set div
					var Content		= m_Traits[ID]["unlock"] ? " " : "";
					var ImageFile 	= "images/trait-" + m_Traits[ID]["number"] + "-" + (m_Traits[ID]["unlock"] ? "unlocked" : "locked") + ".png";
		  			TraitList += '<div id="trait_' + ID + '" class="trait-icon tooltip" onclick="gw2traits.handleTraitClick(this)" style="background-image: url(' + ImageFile + ');" title="A tooltip">' + Content + '</div>';

					//Next column
					Column++;

					//if closer
					if (Column == TierCounts[0] || Column == TierCounts[1] || Column == TierCounts[2]) TraitList += '</div>';
					if (Column == TierCounts[2]) TraitList += '</div>';
				}

				//Write stuff
				document.getElementById('trait-panel').insertAdjacentHTML("beforeend", TraitList);
				if (m_TooltipHandler != null) m_TooltipHandler();
				refreshMaps();
			}
		});
	}

	var loadAcquisitionTypes = function() {
		//Query all acquisition
		var AcquisitionObject 	= Parse.Object.extend("Acquisition");
		var AcquisitionQuery	= new Parse.Query(AcquisitionObject);
		AcquisitionQuery.find({
			success: function(acquisitions) {
				//Initialize 
				var FilterText = "";

				//For each type
				for (var i = 0; i < acquisitions.length; i++) {
					//Get ID
					var ID 	= acquisitions[i].id;
					if (m_Acquisitions[ID] == null) m_Acquisitions[ID]	= true;

					//Opens
					if (i % 3 == 0) FilterText += '<div class="type-config-' + (i == 0 ? "left" : "right") + '">';

					//Set text
					FilterText += '<label><input type="checkbox" onclick="gw2traits.handleAcquisitionClick(this)"';
					if (m_Acquisitions[ID]) FilterText += ' checked="checked"';
					FilterText += ' id=acquisition-check_"' + ID + '" value="' + ID + '"> ' + acquisitions[i].get("name") + '</label><br />';

					//Close
					if (i % 3 == 2) FilterText += '</div>';
				}

				//Write
				document.getElementById('type-config').insertAdjacentHTML("beforeend", FilterText);
			}
		});
	}

	var loadCookies = function() {
		//Get cookie
		var RawCookie = document.cookie;
		if (RawCookie != null && RawCookie.length > 0) {
			//Get json text
			var RawJSON = RawCookie.substr('cookie='.length);
			if (RawJSON != null && RawJSON.length > 0) {
				//Create object
				var Cookie = JSON.parse(decodeURI(RawJSON));

				//Get trait
				if (Cookie.traits != null) {
					//For each trait
					for (var i = 0; i < Cookie.traits.length; i++) {
						//Set
						if (m_Traits[Cookie.traits[i]] == null) m_Traits[Cookie.traits[i]] = {};
						m_Traits[Cookie.traits[i]]["unlock"] = true;
					}
				}

				//Get acquisition filter
				if (Cookie.acquisitions != null) {
					//For each acquisition type
					for (var i = 0; i < Cookie.acquisitions.length; i++) m_Acquisitions[Cookie.acquisitions[i]] = false;
				}

				//Get max level
				if (Cookie.max_level != null) m_MaxLevel = Cookie.max_level;
				document.getElementById("level-filter").value = m_MaxLevel;
			}
		}
	}

	var saveCookies = function() {
		//Initialize object
		var Cookie = {
			traits: [],
			acquisitions: [],
			max_level: m_MaxLevel
		};

		//Populate
		for (var ID in m_Acquisitions) 	if (!m_Acquisitions[ID]) Cookie.acquisitions.push(ID);
		for (var Trait in m_Traits)		if (m_Traits[Trait]["unlock"]) Cookie.traits.push(Trait);

		//Write
		var JSONText = encodeURI(JSON.stringify(Cookie));
		document.cookie = "cookie=" + JSONText + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
	}

	//Refresh map
	var refreshMaps = function() {
		//Recount
		countMaps();

		//Sort and display
		var Maps = sortMaps();
		displayMaps(Maps);
	}

	//Calculate map count
	var countMaps = function() {
		//Reset map counts
		for (var Name in m_MapCount) m_MapCount[Name] = 0;

		//For all traits
		for (var Trait in m_Traits) {
			//Validate map and trait
			var Map 	= m_Traits[Trait]["map"];
			var Valid	= Map != null;
			if (Valid) Valid = !m_Traits[Trait]["unlock"];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_MapLevels[Map] == null;
				if (!Valid) Valid = m_MapLevels[Map] <= m_MaxLevel;
			}

			//If still valid
			if (Valid) {
				//Validate acquisition type
				Valid = m_Acquisitions[m_Traits[Trait]["acquisition"]];
				if (Valid == null) Valid = true;
			}

			//If valid
			if (Valid) {
				//Add to count
				if (m_MapCount[Map] == null) 	m_MapCount[Map] = 1;
				else 							m_MapCount[Map]++;
			}
		}
	}

	//Sort maps from map count
	var sortMaps = function() {
		//For each map
		var Sorted = [];
		for (var Name in m_MapCount) {
			//If not sorted yet, just insert it
			if (Sorted.length <= 0) Sorted[0] = Name;
			else {
				//Find index to be inserted
				Index = -1;
				for (var i = 0; i < Sorted.length && Index < 0; i++) if (m_MapCount[Name] >= m_MapCount[Sorted[i]]) Index = i;
				if (Index < 0) Index = Sorted.length;

				//Insert at index
				Sorted.splice(Index, 0, Name); 
			}
		}

		//Return sorted map
		return Sorted;
	}

	//Display maps
	var displayMaps = function(maps) {
		//Skip if no map
		if (maps == null) return;

		//For each map
		var MapList = "";
		for (var i = 0; i < maps.length; i++) {
			//Get data
			var MapName = maps[i];
			var Count 	= m_MapCount[MapName];
			if (Count != null && Count > 0) {
				//Extend string
				MapList += '<li class="map-item' + (i < 3 ? (i + 1) : '') + '">' + MapName + " (" + Count + " trait" + (Count > 1 ? 's' : '') + ")</li>";
			}
		}

		//Write
		document.getElementById('map-ul').innerHTML = MapList;
	}

	//Trait checkbox click
	var handleTraitClick = function(element) {
		//Skip if no element
		if (element == null) return;

		//Get trait
		var ID 		= element.id.substr("trait_".length);
		var Trait 	= m_Traits[ID];
		if (Trait != null) {
			//Set data
			var Value 		= element.innerHTML.length > 0; 
			Trait["unlock"] = !Value
			saveCookies();

			//Refresh element
			element.innerHTML = Trait["unlock"] ? " " : "";
			element.setAttribute("style", "background-image: url(images/trait-" + Trait["number"] + "-" + (Trait["unlock"] ? "unlocked" : "locked") + ".png);");

			//Recalculate map
			refreshMaps();
		}
	}

	//Filter checkbox click
	var handleAcquisitionClick = function(element) {
		//Skip if no element
		if (element == null) return;

		//Change data
		m_Acquisitions[element.value] = element.checked;
		saveCookies();

		//Refresh
		refreshMaps();
	}

	//Level dropdown click
	var handleLevelChange = function(element) {
		//Skip if no element
		if (element == null) return;

		//Get level
		m_MaxLevel = parseInt(element.value);
		saveCookies();

		//Refresh
		refreshMaps();
	}

	//Return public members
	return { 
		initialize: initialize,
		loadTraits: loadTraits,
		loadAcquisitionTypes: loadAcquisitionTypes,
		handleAcquisitionClick: handleAcquisitionClick,
		handleLevelChange: handleLevelChange,
		handleTraitClick: handleTraitClick
	};
}();
