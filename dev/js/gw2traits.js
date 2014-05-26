/*jshint eqnull:true */

gw2traits = function() {
	//Class variables
	var m_Traits			= {};
	var m_MapLinks			= {};
	var m_MapCount			= {};
	var m_MapLevels			= {};
	var m_Acquisitions		= {};
	var m_MaxLevel			= 80;
	var m_TooltipHandler	= function(){};

	//Constants
	var TRAIT_MAP			= "map";
	var TRAIT_NUMBER		= "number";
	var TRAIT_UNLOCK		= "unlocked";
	var TRAIT_ACQUISITION	= "acquisition";
	var COOKIE_START		= "cookie=";
	var ELEMENT_TRAIT_ID	= "trait_";

	//Initialize stuff
	var initialize = function(tooltip) {
		//Save callback
		m_TooltipHandler = tooltip;

		//Initialize
		Parse.initialize("SDiJ7OLjISzQIt2RTOgQOTlCh8Nj0xPHwm17Isq2", "mkJfAEKHWnCkUgFT7a2Z7Btf0PGoUdBZzMbtqLTd");
		loadCookies();
	};

	//Load traits from database
	var loadTraits = function() {
		//Query all traits
		var TraitObject = Parse.Object.extend("Trait");
		var TraitQuery	= new Parse.Query(TraitObject);
		TraitQuery.ascending("createdAt");
		TraitQuery.include("map");
		TraitQuery.include("acquisition");
		TraitQuery.find({
			success: function(traits) {
				//Initialize
				var Row			= 0;
				var Tier		= 0;
				var Column		= 0;
				var TraitList	= "";
				var TierCounts	= [ 6, 10, 13 ];

				//For each result
				for (var i = 0; i < traits.length; i++) {
					//Check tier
					if (Column >= TierCounts[Tier]) {
						//Increase tier
						Tier++;
						if (Tier >= TierCounts.length) {
							//Reset
							Tier	= 0;
							Column	= 0;
						}
					}

					//Initialize trait data
					var ID = traits[i].id;
					if (m_Traits[ID] == null) m_Traits[ID] = {};

					//Save data
					m_Traits[ID][TRAIT_NUMBER]		= traits[i].get("number");
					m_Traits[ID][TRAIT_ACQUISITION] = traits[i].get(TRAIT_ACQUISITION).id;
					if (m_Traits[ID][TRAIT_UNLOCK] == null) m_Traits[ID][TRAIT_UNLOCK] = false;

					//Get map
					var Map = traits[i].get("map");
					if (Map != null) {
						//Save
						var MapName				= Map.get("name");
						m_MapLinks[MapName]		= Map.get("wiki");
						m_MapLevels[MapName]	= Map.get("minLevel");
						m_Traits[ID][TRAIT_MAP] = MapName;
					}

					//If first column
					if (Column === 0) {
						//Start row
						Row++;
						TraitList += '<div class="trait-row row' + Row + '">';
					}

					//If starting box
					var Box = Column === 0 ? 1 : Column == TierCounts[0] ? 2 : Column == TierCounts[1] ? 3 : 0;
					if (Box > 0) TraitList += '<div class="trait-box box' + Box + '">';

					//Create tool tip
					var Unlock			= traits[i].get("unlocking").replace(/"/g, '&quot;');
					var TooltipLabel 	= Map != null ? m_Traits[ID][TRAIT_MAP] : traits[i].get(TRAIT_ACQUISITION).get("name");
					var Tooltip 		= '&lt;div class=&quot;tooltip-unlock&quot;&gt;' + Unlock + '&lt;/div&gt;&lt;div class=&quot;tooltip-map&quot;&gt;' + TooltipLabel + ' &lt;/div&gt;';

					//Set div
					var Content	= m_Traits[ID][TRAIT_UNLOCK] ? " " : "";
					TraitList += '<div id="' + ELEMENT_TRAIT_ID + ID + '" class="trait-icon tooltip" onclick="gw2traits.handleTraitClick(this)" style="' + getTraitStyle(ID) + '" title="' + Tooltip + '">' + Content + '</div>';

					//Next column
					Column++;

					//if closer
					if (Column === TierCounts[0] || Column === TierCounts[1] || Column === TierCounts[2]) TraitList += '</div>';
					if (Column === TierCounts[2]) TraitList += '</div>';
				}

				//Write stuff
				document.getElementById('trait-panel').insertAdjacentHTML("beforeend", TraitList);
				if (m_TooltipHandler != null) m_TooltipHandler();
				refreshMaps();
			}
		});
	};

	//Load acquisition types from database
	var loadAcquisitionTypes = function() {
		//Query all acquisition
		var AcquisitionObject	= Parse.Object.extend("Acquisition");
		var AcquisitionQuery	= new Parse.Query(AcquisitionObject);
		AcquisitionQuery.find({
			success: function(acquisitions) {
				//Initialize 
				var FilterText = "";

				//For each type
				for (var i = 0; i < acquisitions.length; i++) {
					//Get ID
					var ID = acquisitions[i].id;
					if (m_Acquisitions[ID] == null) m_Acquisitions[ID] = true;

					//Opens
					if (i % 3 === 0) FilterText += '<div class="type-config-' + (i === 0 ? "left" : "right") + '">';

					//Set text
					FilterText += '<label><input type="checkbox" onclick="gw2traits.handleAcquisitionClick(this)"';
					if (m_Acquisitions[ID]) FilterText += ' checked="checked"';
					FilterText += ' id=acquisition-check_"' + ID + '" value="' + ID + '"> ' + acquisitions[i].get("name") + '</label><br />';

					//Close
					if (i % 3 === 2) FilterText += '</div>';
				}

				//Write
				document.getElementById('type-config').insertAdjacentHTML("beforeend", FilterText);
			}
		});
	};

	var loadCookies = function() {
		//Get cookie
		var RawCookie = document.cookie;
		console.log("load cookies");
		if (RawCookie != null && RawCookie.length > 0) {
			//Get json text
			console.log("Cookies: " + RawCookie);
			var RawJSON = RawCookie.substr(COOKIE_START.length);
			if (RawJSON != null && RawJSON.length > 0) {
				//Create object
				var Cookie = JSON.parse(decodeURI(RawJSON));

				//Get trait
				var i = 0;
				if (Cookie.traits != null) {
					//For each trait
					for (i = 0; i < Cookie.traits.length; i++) {
						//Set
						if (m_Traits[Cookie.traits[i]] == null) m_Traits[Cookie.traits[i]] = {};
						m_Traits[Cookie.traits[i]][TRAIT_UNLOCK] = true;
					}
				}

				//Get acquisition filter
				if (Cookie.acquisitions != null) {
					//For each acquisition type
					for (i = 0; i < Cookie.acquisitions.length; i++) m_Acquisitions[Cookie.acquisitions[i]] = false;
				}

				//Get max level
				if (Cookie.max_level != null) m_MaxLevel = Cookie.max_level;
				document.getElementById("level-filter").value = m_MaxLevel;
			}
		}
	};

	var saveCookies = function() {
		//Initialize object
		var Cookie = {
			traits: [],
			acquisitions: [],
			max_level: m_MaxLevel
		};

		//Populate
		for (var ID in m_Acquisitions)	if (!m_Acquisitions[ID]) Cookie.acquisitions.push(ID);
		for (var Trait in m_Traits)		if (m_Traits[Trait][TRAIT_UNLOCK]) Cookie.traits.push(Trait);

		//Write
		var JSONText = encodeURI(JSON.stringify(Cookie));
		document.cookie = COOKIE_START + JSONText + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
	};

	var getTraitStyle = function(id) {
		//Initialize
		var Style = "";

		//If there's ID
		if (id != null) {
			//If trait exist
			var Trait = m_Traits[id];
			if (Trait != null) Style = "background-image: url(images/trait-" + Trait[TRAIT_NUMBER] + ".png); background-position: " + (Trait[TRAIT_UNLOCK] ? "100" : "0") + "% 0;";
		}

		//Return
		return Style;
	};

	//Set trait unlocking status
	var setTraitUnlock = function(id, unlocked) {
		//Skip if no ID
		if (id == null) return;

		//Initialize
		var Trait		= m_Traits[id];
		var Unlocked	= Boolean(unlocked);
		var Changed		= false;

		//If trait exist
		if (Trait != null) {
			//Check old value
			var WasUnlocked = Trait[TRAIT_UNLOCK];
			if (WasUnlocked != Unlocked) {
				//Set data
				Changed				= true;
				Trait[TRAIT_UNLOCK] = Unlocked;

				//Get element
				var Element = document.getElementById(ELEMENT_TRAIT_ID + id);
				if (Element != null) {
					//Refresh element
					Element.innerHTML = Trait[TRAIT_UNLOCK] ? " " : "";
					Element.setAttribute("style", getTraitStyle(id));
				}
			}
		}

		//Return
		return Changed;
	};

	//Set all trait unlocking status
	var setAllTraitsUnlock = function(unlocked) {
		//For all traits
		var Changed = false;
		for (var ID in m_Traits) if (setTraitUnlock(ID, unlocked)) Changed = true;

		//If there's a change
		if (Changed) {
			//Do stuff
			saveCookies();
			refreshMaps();
		}
	};

	//Refresh map
	var refreshMaps = function() {
		//Recount
		countMaps();

		//Sort and display
		var Maps = sortMaps();
		displayMaps(Maps);
	};

	//Calculate map count
	var countMaps = function() {
		//Reset map counts
		for (var Name in m_MapCount) m_MapCount[Name] = 0;

		//For all traits
		for (var Trait in m_Traits) {
			//Validate map and trait
			var Map		= m_Traits[Trait][TRAIT_MAP];
			var Valid	= Map != null;
			if (Valid) Valid = !m_Traits[Trait][TRAIT_UNLOCK];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_MapLevels[Map] == null;
				if (!Valid) Valid = m_MapLevels[Map] <= m_MaxLevel;
			}

			//If still valid
			if (Valid) {
				//Validate acquisition type
				Valid = m_Acquisitions[m_Traits[Trait][TRAIT_ACQUISITION]];
				if (Valid == null) Valid = true;
			}

			//If valid
			if (Valid) {
				//Add to count
				if (m_MapCount[Map] == null)	m_MapCount[Map] = 1;
				else							m_MapCount[Map]++;
			}
		}
	};

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
	};

	//Display maps
	var displayMaps = function(maps) {
		//Skip if no map
		if (maps == null) return;

		//For each map
		var MapList = "";
		for (var i = 0; i < maps.length; i++) {
			//Get data
			var Wiki	= "";
			var MapName = maps[i];
			var Count	= m_MapCount[MapName];

			//If have a count
			if (Count != null && Count > 0) {
				//Extend string
				if (m_MapLinks[MapName] != null) Wiki = ' href="' + m_MapLinks[MapName] + '" title="' + MapName + ' - Guild Wars 2 Wiki" target="_blank"';
				MapList += '<li><a class="map-item' + (i < 3 ? (" item" + (i + 1)) : '') + '"' + Wiki + '>' + MapName + " (" + Count + " trait" + (Count > 1 ? 's' : '') + ")</a></li>";
			}
		}

		//Write
		document.getElementById('map-ul').innerHTML = MapList;
	};

	//Trait checkbox click
	var handleTraitClick = function(element) {
		//Skip if no element
		if (element == null) return;

		//Get data
		var ID		= element.id.substr(ELEMENT_TRAIT_ID.length);
		var Value	= element.innerHTML.length > 0;

		//Set unlocking
		if (setTraitUnlock(ID, !Value)) {
			//Do stuff
			saveCookies();
			refreshMaps();
		}
	};

	//Filter checkbox click
	var handleAcquisitionClick = function(element) {
		//Skip if no element
		if (element == null) return;

		//Change data
		m_Acquisitions[element.value] = element.checked;
		saveCookies();

		//Refresh
		refreshMaps();
	};

	//Level dropdown click
	var handleLevelChange = function(element) {
		//Skip if no element
		if (element == null) return;

		//Get level
		m_MaxLevel = parseInt(element.value, 10);
		saveCookies();

		//Refresh
		refreshMaps();
	};

	//Return public members
	return {
		initialize: initialize,
		loadTraits: loadTraits,
		loadAcquisitionTypes: loadAcquisitionTypes,
		handleAcquisitionClick: handleAcquisitionClick,
		setAllTraitsUnlock: setAllTraitsUnlock,
		handleLevelChange: handleLevelChange,
		handleTraitClick: handleTraitClick
	};
}();
