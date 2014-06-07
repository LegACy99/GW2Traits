/*jshint eqnull:true */

var GW2Traits = function() {
	//App data
	var m_MapLinks	= {};
	var m_MapCount	= {};
	var m_MapLevels	= {};

	//Cookie data
	var m_MaxLevel			= 80;
	var m_TraitUnlocks		= {};
	var m_Acquisitions		= {};
	var m_LastNotification	= new Date(0);

	//Other data
	var m_TraitsParameter	= null;
	var m_TooltipHandler	= function(){};

	//Constants
	var PARAMETER_TRAITS	= "traits";
	var ELEMENT_TRAIT_ID	= "trait_";
	var COOKIE_START		= "cookie";

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
		TraitQuery.include("acquisition");
		TraitQuery.include("map");
		TraitQuery.find({
			success: function(traits) {
				//Initialize
				var Row			= 0;
				var Tier		= 0;
				var Column		= 0;
				var TraitList	= "";
				var TierCounts	= [ 6, 10, 13 ];
				var ID, i;

				//For each trait
				TraitManager.setTraits(traits);
				for (i = 0; i < traits.length; i++) {
					//Initialize
					ID = traits[i].id;
					if (m_TraitUnlocks[ID] == null)	m_TraitUnlocks[ID] = false;
				}

				//There's parameter?
				if (m_TraitsParameter != null) {
					//Decode
					m_TraitUnlocks = TraitManager.decodeTraits(m_TraitsParameter);
					m_TraitsParameter = null;
				}

				//For ecah result
				for (i = 0; i < traits.length; i++) {
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
					ID = traits[i].id;

					//Get map
					var Map = traits[i].get("map");
					if (Map != null) {
						//Save
						var MapName				= Map.get("name");
						m_MapLinks[MapName]		= Map.get("wiki");
						m_MapLevels[MapName]	= Map.get("minLevel");
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
					var TooltipLabel	= Map != null ? TraitManager.getTraitMap(ID) : traits[i].get("acquisition").get("name");
					var Tooltip			= '&lt;div class=&quot;tooltip-unlock&quot;&gt;' + Unlock + '&lt;/div&gt;&lt;div class=&quot;tooltip-map&quot;&gt;' + TooltipLabel + ' &lt;/div&gt;';

					//Set div
					var Content	= m_TraitUnlocks[ID] ? " " : "";
					TraitList += '<div id="' + ELEMENT_TRAIT_ID + ID + '" class="trait-icon tooltip" onclick="GW2Traits.handleTraitClick(this)" style="' + getTraitStyle(ID) + '" title="' + Tooltip + '">' + Content + '</div>';

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
					FilterText += '<label><input type="checkbox" onclick="GW2Traits.handleAcquisitionClick(this)"';
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
	};

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
							var j;
							var Cookie = JSON.parse(decodeURI(RawJSON));

							//Get trait
							if (Cookie.traits != null) {
								//For each trait
								for (j = 0; j < Cookie.traits.length; j++) m_TraitUnlocks[Cookie.traits[j]] = true;
							}

							//Get acquisition filter
							if (Cookie.acquisitions != null) {
								//For each acquisition type
								for (j = 0; j < Cookie.acquisitions.length; j++) m_Acquisitions[Cookie.acquisitions[j]] = false;
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
		for (var TraitID in m_TraitUnlocks)			if (m_TraitUnlocks[TraitID]) Cookie.traits.push(TraitID);
		for (var AcqusitionID in m_Acquisitions)	if (!m_Acquisitions[AcqusitionID]) Cookie.acquisitions.push(AcqusitionID);

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
			var Num = TraitManager.getTraitNumber(id);
			if (Num != null) Style = "background-image: url(images/trait-" + Num + ".png); background-position: " + (m_TraitUnlocks[id] ? "100" : "0") + "% 0;";
		}

		//Return
		return Style;
	};

	//Set trait unlocking status
	var setTraitUnlock = function(id, unlocked) {
		//Skip if no ID
		if (id == null) return;

		//Initialize
		var Unlocked	= Boolean(unlocked);
		var Changed		= false;

		//If trait exist
		if ( m_TraitUnlocks[id] != null) {
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
		for (var ID in m_TraitUnlocks) if (setTraitUnlock(ID, unlocked)) Changed = true;

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
		for (var Name in m_MapCount) if (m_MapCount.hasOwnProperty(Name)) m_MapCount[Name] = 0;

		//For all traits
		var Traits = TraitManager.getTraitIDs();
		for (var i = 0; i < Traits.length; i++) {							
			//Validate map and trait
			var Map		= TraitManager.getTraitMap(Traits[i]);
			var Valid	= Map != null;
			if (Valid) Valid = !m_TraitUnlocks[Traits[i]];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_MapLevels[Map] == null;
				if (!Valid) Valid = m_MapLevels[Map] <= m_MaxLevel;
			}

			//If still valid
			if (Valid) {
				//Validate acquisition type
				Valid = m_Acquisitions[TraitManager.getTraitAcquisition(Traits[i])];
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
						if (m_MapLevels[Sorted[i]] == null)							Index = i;
						else if (Level != null && Level <= m_MapLevels[Sorted[i]])	Index = i;
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
		var Encoded = TraitManager.encodeTraits(m_TraitUnlocks);

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
