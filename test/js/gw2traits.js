gw2traits = function() {
	//Class variables
	var m_MaxLevel			= 80;
	var m_MapCount 			= {};
	var m_MapLevels			= {};
	var m_TraitMaps			= {};
	var m_Acquisitions		= {};
	var m_TraitUnlocks		= {};
	var m_TraitAcquisitions	= {};

	var initialize = function() {
		//Initialize
		Parse.initialize("SDiJ7OLjISzQIt2RTOgQOTlCh8Nj0xPHwm17Isq2", "mkJfAEKHWnCkUgFT7a2Z7Btf0PGoUdBZzMbtqLTd");
		loadCookies();
	};

	var loadTraits = function() {
		//Query all traits
		var TraitObject = Parse.Object.extend("Trait");
		var TraitQuery	= new Parse.Query(TraitObject);	
		TraitQuery.include("map");
		TraitQuery.find({
			success: function(traits) {
				//For each result
				var TraitList = "";
				for (var i = 0; i < traits.length; i++) {
					//Start trait item list
					TraitList += '<li>Trait ' + traits[i].get("line") + '-' + traits[i].get("number");

					//Set up data
					var ID 					= traits[i].id;
					m_TraitAcquisitions[ID] = traits[i].get("acquisition").id;
					if (m_TraitUnlocks[ID] == null) m_TraitUnlocks[ID] = false;

					//Get map
					var Map = traits[i].get("map");
					if (Map != null) {
						//Save
						var MapName 			= Map.get("name");
						m_MapLevels[MapName]	= Map.get("minLevel");
						m_TraitMaps[ID] 		= MapName;

						//Extend string
						TraitList += " at " + MapName;
					}

					//Close
					TraitList += ' <input id=trait-check_"' + ID + '" value="' + ID + '" type="checkbox" onclick="gw2traits.handleTraitClick(this)"';
					if (m_TraitUnlocks[ID]) TraitList += ' checked="checked"';
					TraitList += '></li>';
				}

				//Write stuff
				document.getElementById('traits').innerHTML = TraitList;
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
				//For each type
				var FilterText = "";
				for (var i = 0; i < acquisitions.length; i++) {
					//Get ID
					var ID 	= acquisitions[i].id;
					if (m_Acquisitions[ID] == null) m_Acquisitions[ID]	= true; 

					//Set text
					FilterText += '<label><input type="checkbox" onclick="gw2traits.handleAcquisitionClick(this)"';
					if (m_Acquisitions[ID]) FilterText += ' checked="checked"';
					FilterText += ' id=acquisition-check_"' + ID + '" value="' + ID + '"> ' + acquisitions[i].get("name") + '</label><br />';
				}

				//Write
				document.getElementById('acquisition-filter').innerHTML = FilterText;
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
					//Save each trait data
					for (var i = 0; i < Cookie.traits.length; i++) m_TraitUnlocks[Cookie.traits[i]] = true;
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
		for (var ID in m_Acquisitions) 		if (!m_Acquisitions[ID]) Cookie.acquisitions.push(ID);
		for (var Trait in m_TraitUnlocks)	if (m_TraitUnlocks[Trait]) Cookie.traits.push(Trait);

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
		for (var Trait in m_TraitAcquisitions) {
			//Validate map and trait
			var Map 	= m_TraitMaps[Trait];
			var Valid	= Map != null;
			if (Valid) Valid = !m_TraitUnlocks[Trait];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_MapLevels[Map] == null;
				if (!Valid) Valid = m_MapLevels[Map] <= m_MaxLevel;
			}

			//If still valid
			if (Valid) {
				//Validate acquisition type
				Valid = m_Acquisitions[m_TraitAcquisitions[Trait]];
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
				MapList += "<li>" + MapName + " - " + Count + "</li>";
			}
		}

		//Write
		document.getElementById('maps').innerHTML = MapList;
	}

	//Trait checkbox click
	var handleTraitClick = function(element) {
		//Skip if no element
		if (element == null) return;

		//Change data
		m_TraitUnlocks[element.value] = element.checked;
		saveCookies();

		//Refresh
		refreshMaps();
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
