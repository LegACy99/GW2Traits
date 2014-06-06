/*jshint eqnull:true */

gw2traits = function() {
	//App data
	var m_MapLinks	= {};
	var m_MapCount	= {};
	var m_MapLevels	= {};
	var m_Traits	= {};

	//Cookie data
	var m_MaxLevel			= 80;
	var m_TraitUnlocks		= {};
	var m_Acquisitions		= {};
	var m_LastNotification	= new Date(0);

	//Other data
	var m_TraitsParameter	= null;
	var m_TooltipHandler	= function(){};

	//Constants
	var TRAIT_MAP			= "map";
	var TRAIT_NUMBER		= "number";
	var TRAIT_ACQUISITION	= "acquisition";
	var ENCODING_ALPHABET	= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
	var PARAMETER_TRAITS	= "traits";
	var ELEMENT_TRAIT_ID	= "trait_";
	var COOKIE_START		= "cookie";
	var ENCODE_CHUNK		= 6;

	//Initialize stuff
	var initialize = function(tooltip) {
		//Save callback
		m_TooltipHandler = tooltip;

		//Initialize
		Parse.initialize("SDiJ7OLjISzQIt2RTOgQOTlCh8Nj0xPHwm17Isq2", "mkJfAEKHWnCkUgFT7a2Z7Btf0PGoUdBZzMbtqLTd");
		loadCookies();

		//Check URL
		var Query = window.location.search.substring(1);
		if (Query != null && Query.length > 0) {
			//Get all parameter
			var Parameters = Query.split("&");
			for (var i = 0; i < Parameters.length; i++) {
				//Check parameter name
				var Parameter = Parameters[i].split("=");
				if (Parameter.length >= 2 && Parameter[0] == PARAMETER_TRAITS) m_TraitsParameter = Parameter[1];
			}
		}
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

				//For each trait
				for (var i = 0; i < traits.length; i++) {
					//Initialize
					var ID = traits[i].id;
					if (m_Traits[ID] == null) 		m_Traits[traits[i].id] = {};
					if (m_TraitUnlocks[ID] == null)	m_TraitUnlocks[ID] = false;
				}

				//There's parameter?
				if (m_TraitsParameter != null) {
					//Decode
					decodeTraits(m_TraitsParameter);
					m_TraitsParameter = null;
				}

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

					//Save data
					var ID = traits[i].id;
					m_Traits[ID][TRAIT_NUMBER]		= traits[i].get("number");
					m_Traits[ID][TRAIT_ACQUISITION] = traits[i].get(TRAIT_ACQUISITION).id;
					if (m_TraitUnlocks[ID] == null) m_TraitUnlocks[ID] = false;

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
					var Content	= m_TraitUnlocks[ID] ? " " : "";
					TraitList += '<div id="' + ELEMENT_TRAIT_ID + ID + '" class="trait-icon tooltip" onclick="gw2traits.handleTraitClick(this)" style="' + getTraitStyle(ID) + '" title="' + Tooltip + '">' + Content + '</div>';

					//Next column
					Column++;

					//if closer
					if (Column === TierCounts[0] || Column === TierCounts[1] || Column === TierCounts[2]) TraitList += '</div>';
					if (Column === TierCounts[2]) TraitList += '</div>';
				}

				//Write stuff
				document.getElementById('trait-panel').insertAdjacentHTML("beforeend", TraitList);
				document.getElementById('trait-buttons').setAttribute("style", "display: inline-block;");
				document.getElementById('export').setAttribute("style", "display: block;");
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

	var loadNotification = function() {
		//Prepare query
		var NewsObject	= Parse.Object.extend("News");
		var NewsQuery	= new Parse.Query(NewsObject);
		NewsQuery.lessThanOrEqualTo("publish", new Date());		//Not future notification
		NewsQuery.greaterThan("publish", m_LastNotification);	//Ahead of the last closed notification
		NewsQuery.descending("publish");						//Latest one first
		NewsQuery.exists("publish");							//Not null

		//Get news item
		NewsQuery.first({
			success: function(news) {
				//If there's a news
				if (news != null && news.get('title') != null) {
					//Get element
					var Message = document.getElementById('notification-message');
					if (Message != null) {
						//Set message
						Message.innerHTML = news.get('title');

						//Show notification
						var Notification = document.getElementById('notification');
						if (Notification != null) Notification.setAttribute("style", "display: block;");
					}
				}
			}
		});
	}

	var loadCookies = function() {
		//Get cookie
		var RawCookie = document.cookie;
		if (RawCookie != null && RawCookie.length > 0) {
			//Get all cookies
			var Cookies = RawCookie.split('; ');
			if (Cookies != null) {
				//For each cookie
				for (var i = 0; i < Cookies.length; i++) {
					//Split
					var CookiePair = Cookies[i].split('=');
					if (CookiePair != null && CookiePair.length >= 2 && CookiePair[0] != null && CookiePair[0] == COOKIE_START) {
						//Get cookie value
						var RawJSON = CookiePair[1];
						if (RawJSON != null && RawJSON.length > 0) {
							//Create object
							var Cookie = JSON.parse(decodeURI(RawJSON));

							//Get trait
							var i = 0;
							if (Cookie.traits != null) {
								//For each trait
								for (i = 0; i < Cookie.traits.length; i++) m_TraitUnlocks[Cookie.traits[i]] = true;
							}

							//Get acquisition filter
							if (Cookie.acquisitions != null) {
								//For each acquisition type
								for (i = 0; i < Cookie.acquisitions.length; i++) m_Acquisitions[Cookie.acquisitions[i]] = false;
							}

							//Get max level
							if (Cookie.max_level != null) m_MaxLevel = Cookie.max_level;
							document.getElementById("level-filter").value = m_MaxLevel;

							//Get last notification
							if (Cookie.last_notif != null) m_LastNotification = new Date(Cookie.last_notif);
						}
					}
				}
			}
		}
	};

	var saveCookies = function() {
		//Initialize object
		var Cookie = {
			traits: [],
			acquisitions: [],
			max_level: m_MaxLevel,
			last_notif: m_LastNotification
		};

		//Populate
		for (var ID in m_Acquisitions)	if (!m_Acquisitions[ID]) Cookie.acquisitions.push(ID);
		for (var ID in m_Traits)		if (m_TraitUnlocks[ID]) Cookie.traits.push(ID);

		//Write
		var JSONText = encodeURI(JSON.stringify(Cookie));
		document.cookie = COOKIE_START + '=' + JSONText + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
	};

	var getTraitStyle = function(id) {
		//Initialize
		var Style = "";

		//If there's ID
		if (id != null) {
			//If trait exist
			var Trait = m_Traits[id];
			if (Trait != null) Style = "background-image: url(images/trait-" + Trait[TRAIT_NUMBER] + ".png); background-position: " + (m_TraitUnlocks[id] ? "100" : "0") + "% 0;";
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
			var WasUnlocked = m_TraitUnlocks[id];
			if (WasUnlocked != Unlocked) {
				//Set data
				Changed				= true;
				m_TraitUnlocks[id]	= Unlocked;

				//Get element
				var Element = document.getElementById(ELEMENT_TRAIT_ID + id);
				if (Element != null) {
					//Refresh element
					Element.innerHTML = m_TraitUnlocks[id] ? " " : "";
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
		for (var ID in m_Traits) {
			//Validate map and trait
			var Map		= m_Traits[ID][TRAIT_MAP];
			var Valid	= Map != null;
			if (Valid) Valid = !m_TraitUnlocks[ID];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_MapLevels[Map] == null;
				if (!Valid) Valid = m_MapLevels[Map] <= m_MaxLevel;
			}

			//If still valid
			if (Valid) {
				//Validate acquisition type
				Valid = m_Acquisitions[m_Traits[ID][TRAIT_ACQUISITION]];
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
				//For each sorted one
				var Index = -1;
				var Count = m_MapCount[Name];
				var Level = m_MapLevels[Name];
				for (var i = 0; i < Sorted.length && Index < 0; i++) {
					//If count is bigger, set
					if (Count > m_MapCount[Sorted[i]]) Index = i;
					else if (Count == m_MapCount[Sorted[i]]) {
						//Check level
						if (m_MapLevels[Sorted[i]] == null) 						Index = i;
						else if (Level != null && Level <= m_MapLevels[Sorted[i]]) 	Index = i;
					}
				}

				//If not found, put it at the last one
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

	var encodeTraits = function() {
		//Initialize
		var Count			= 0;
		var Empty			= 0;
		var TraitsValue 	= 0;
		var TraitsFactor 	= 1;
		var Result  		= "";

		//For each trait
		for (var ID in m_Traits) {
			//Save
			if (m_TraitUnlocks[ID]) TraitsValue += TraitsFactor;
			TraitsFactor *= 2;

			//Check if chunk size reached
			Count++;
			if (Count >= ENCODE_CHUNK || (Count == ENCODE_CHUNK - 1 && Result.length + Empty == 10)) {
				//If nothing, don't do anything
				if (TraitsValue == 0) Empty++;
				else {
					//Append the corresponding character
					for (var i = 0; i < Empty; i++) Result = ENCODING_ALPHABET.charAt(0) + Result;
					Result = ENCODING_ALPHABET.charAt(TraitsValue) + Result;
					Empty = 0;
				}

				//Reset
				Count			= 0;
				TraitsValue 	= 0;
				TraitsFactor	= 1;
			}
		}

		//Return
		return Result;
	};

	var decodeTraits = function(traits) {
		//Validate
		if (traits == null) 	return;
		if (traits.length <= 0)	return;

		//Initialize
		var Min 	= 0;
		var Traits 	= [];
		if (traits.length > 11) Min = traits.length - 11;
		for (var i = 0; i < Object.keys(m_Traits).length; i++) Traits.push(false);

		//For each character
		for (var i = traits.length - 1; i >= Min; i--) {
			//Get value
			var Char 	= traits.charAt(i);
			var Value 	= ENCODING_ALPHABET.indexOf("" + Char);
			if (Value >= ENCODING_ALPHABET.length) 	Value = ENCODING_ALPHABET - 1
			if (Value < 0) 							Value = 0;

			//While
			var Offset = ENCODE_CHUNK - 1;
			var Factor = Math.pow(2, Offset);
			while (Offset >= 0) {
				//If true for that factor
				if (Value >= Factor) {
					//Remove from value
					Value -= Factor;

					//Check index
					var Index = ((traits.length - 1 - i) * ENCODE_CHUNK) + Offset;
					if (Index < Traits.length) Traits[Index] = true;
				}

				//Reduce
				Factor /= 2;
				Offset--;
			}
		}

		//Save
		var Index = 0;
		for (var ID in m_Traits) {
			//Save
			m_TraitUnlocks[ID] = Traits[Index];
			Index++;
		}
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

	//Notification close
	var handleNotificationClose = function() {
		//Get notification
		var Notification = document.getElementById('notification');
		if (Notification != null) {
			//Close
			Notification.setAttribute("style", "display: none;");

			//Set last notification
			m_LastNotification = new Date();
			saveCookies();
		}
	};

	//Exporting
	var handleExportClick = function() {
		//Encode traits
		var Encoded = encodeTraits();

		//Get result element
		var Result = document.getElementById('export-result');
		if (Result != null && Encoded != null) {
			//Configure element
			Result.setAttribute("value", "http://www.gw2traits.com/?" + PARAMETER_TRAITS + "=" + Encoded);
			Result.setAttribute("class", "export-result");
			Result.removeAttribute("disabled");
			Result.select();
		}
	};

	//Return public members
	return {
		initialize: initialize,
		loadTraits: loadTraits,
		loadNotification: loadNotification,
		loadAcquisitionTypes: loadAcquisitionTypes,
		handleAcquisitionClick: handleAcquisitionClick,
		handleNotificationClose: handleNotificationClose,
		setAllTraitsUnlock: setAllTraitsUnlock,
		handleExportClick: handleExportClick,
		handleLevelChange: handleLevelChange,
		handleTraitClick: handleTraitClick
	};
}();
