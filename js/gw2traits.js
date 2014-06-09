/* jshint eqnull:true			*/
/* global Parse, TraitManager	*/
/* exported GW2Traits			*/

var GW2Traits = function() {
	//App data
	var m_Maps				= {};
	var m_TraitsParameter	= null;
	var m_TooltipHandler	= function(){};
	var m_Traits			= TraitManager();

	//Cookie data
	var m_MaxLevel			= 80;
	var m_LastNotification	= new Date(0);
	var m_AcquisitionFilter	= {};
	var m_TraitUnlocks		= {};

	//Other data

	//Constants
	var ELEMENT_TRAIT_ID	= "trait_";
	var PARAMETER_TRAITS	= "traits";
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
				m_Traits.setTraits(traits);
				if (m_TraitsParameter != null) {
					//Decode
					m_TraitUnlocks		= m_Traits.decodeTraits(m_TraitsParameter);
					m_TraitsParameter	= null;
				}

				//For each trait
				for (var i = 0; i < traits.length; i++) {
					//Get map
					var Map = traits[i].get("map");
					if (Map != null) m_Maps[Map.get("name")] = {
						level: Map.get("minLevel"),
						link: Map.get("wiki")
					};
				}

				//Get structured trait
				var TraitList	= "";
				var Traits		= m_Traits.getTraitIDs(true);
				for (var row = 0; row < Traits.length; row++) {
					//Open row
					TraitList += '<div class="trait-row row' + row + '">';
					for (var tier = 0; tier < Traits[row].length; tier++) {
						//Open tier box
						TraitList += '<div class="trait-box box' + (tier + 1) + '">';
						for (var cell = 0; cell < Traits[row][tier].length; cell++) {
							//Write cell
							var ID		= Traits[row][tier][cell];
							var Content	= m_TraitUnlocks[ID] ? " " : "";
							TraitList += '<div id="' + ELEMENT_TRAIT_ID + ID + '" class="trait-icon" onclick="GW2Traits.handleTraitClick(this)" style="' + getTraitStyle(ID) + '">' + Content + '</div>';
						}

						//Close tier box
						TraitList += "</div>";
					}

					//Close row
					TraitList += "</div>";
				}

				//Browse array
				/*var Row			= 0;
				var Tier		= 0;
				var Column		= 0;
				var TraitList	= "";
				var TierCounts	= [ 6, 10, 13 ];
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
					var ID				= traits[i].id;
					var Unlock			= traits[i].get("unlocking").replace(/"/g, '&quot;');
					var TooltipLabel	= Map != null ? m_Traits.getTraitMap(ID) : traits[i].get("acquisition").get("name");
					var Tooltip			= '&lt;div class=&quot;tooltip-unlock&quot;&gt;' + Unlock + '&lt;/div&gt;&lt;div class=&quot;tooltip-map&quot;&gt;' + TooltipLabel + ' &lt;/div&gt;';

					//Set div
					var Content	= m_TraitUnlocks[ID] ? " " : "";
					TraitList += '<div id="' + ELEMENT_TRAIT_ID + ID + '" class="trait-icon tooltip" onclick="GW2Traits.handleTraitClick(this)" style="' + getTraitStyle(ID) + '" title="' + Tooltip + '">' + Content + '</div>';

					//Next column
					Column++;
					if (Column === TierCounts[0] || Column === TierCounts[1] || Column === TierCounts[2]) TraitList += '</div>';
					if (Column === TierCounts[2]) TraitList += '</div>';
				}*/

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
					//Opens
					if (i % 3 === 0) FilterText += '<div class="type-config-' + (i === 0 ? "left" : "right") + '">';

					//Set text
					var ID = acquisitions[i].id;
					FilterText += '<label><input type="checkbox" onclick="GW2Traits.handleAcquisitionClick(this)"';
					if (!m_AcquisitionFilter[ID]) FilterText += ' checked="checked"';
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
							var j		= 0;
							var Cookie = JSON.parse(decodeURI(RawJSON));

							//Get trait and acquisition
							if (Cookie.traits != null)			for (j = 0; j < Cookie.traits.length; j++) m_TraitUnlocks[Cookie.traits[j]] = true;
							if (Cookie.acquisitions != null)	for (j = 0; j < Cookie.acquisitions.length; j++) m_AcquisitionFilter[Cookie.acquisitions[j]] = true;

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
		for (var TraitID in m_TraitUnlocks)				if (m_TraitUnlocks[TraitID]) Cookie.traits.push(TraitID);
		for (var AcqusitionID in m_AcquisitionFilter)	if (m_AcquisitionFilter[AcqusitionID]) Cookie.acquisitions.push(AcqusitionID);

		//Write
		var JSONText = encodeURI(JSON.stringify(Cookie));
		document.cookie = COOKIE_START + '=' + JSONText + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
	};

	var getTraitStyle = function(id) {
		//Initialize
		var Result = "";

		//If there's ID
		if (id != null) {
			//If trait exist
			var Num = m_Traits.getTraitNumber(id);
			if (Num != null) Result = "background-image: url(images/trait-" + Num + ".png); background-position: " + (m_TraitUnlocks[id] ? "100" : "0") + "% 0;";
		}

		//Return
		return Result;
	};

	//Set trait unlocking status
	var setTraitUnlock = function(id, unlocked) {
		//Skip if no ID
		if (id == null) return;

		//Initialize
		var Changed		= false;
		var Unlocked	= Boolean(unlocked);
		var WasUnlocked = Boolean(m_TraitUnlocks[id]);

			//Check old value
		if (WasUnlocked != Unlocked) {
			//Set data
			Changed = true;
			if (Unlocked)	m_TraitUnlocks[id] = true;
			else			delete m_TraitUnlocks[id];

			//Get element
			var Element = document.getElementById(ELEMENT_TRAIT_ID + id);
			if (Element != null) {
				//Refresh element
				Element.innerHTML = m_TraitUnlocks[id] ? " " : "";
				Element.setAttribute("style", getTraitStyle(id));
			}
		}

		//Return
		return Changed;
	};

	//Set all trait unlocking status
	var setAllTraitsUnlock = function(unlocked) {
		//Change all traits
		var Changed = false;
		var Traits	= m_Traits.getTraitIDs();
		for (var i = 0; i < Traits.length; i++) if (setTraitUnlock(Traits[i], unlocked)) Changed = true;

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
		var Counts = countMaps();

		//Sort and display
		var Maps = sortMaps(Counts);
		displayMaps(Maps, Counts);
	};

	//Calculate map count
	var countMaps = function() {
		//Initialize
		var Result = {};
		var Traits = m_Traits.getTraitIDs();
		for (var i = 0; i < Traits.length; i++) {
			//Validate map
			var Name	= m_Traits.getTraitMap(Traits[i]);
			var Valid	= Name != null;

			//If not unlocked and unfiltered
			if (Valid) Valid = !m_TraitUnlocks[Traits[i]];			
			if (Valid) Valid = !m_AcquisitionFilter[m_Traits.getTraitAcquisition(Traits[i])];

			//If still valid
			if (Valid) {
				//Validate minimum level
				Valid = m_Maps[Name].level == null;
				if (!Valid) Valid = m_Maps[Name].level <= m_MaxLevel;
			}

			//If valid
			if (Valid) {
				//Add to count
				if (Result[Name] == null)	Result[Name] = 1;
				else						Result[Name]++;
			}
		}

		//Return
		return Result;
	};

	//Sort maps from map count
	var sortMaps = function(counts) {
		//For each map
		var Sorted = [];
		for (var Name in counts) {
			//If not sorted yet, just insert it
			if (Sorted.length <= 0) Sorted[0] = Name;
			else {
				//For each sorted one
				var Index = -1;
				var Count = counts[Name];
				var Level = m_Maps[Name].level;
				for (var i = 0; i < Sorted.length && Index < 0; i++) {
					//If count is bigger, set
					if (Count > counts[Sorted[i]]) Index = i;
					else if (Count == counts[Sorted[i]]) {
						//Check level
						if (m_Maps[Sorted[i]].level == null)						Index = i;
						else if (Level != null && Level <= m_Maps[Sorted[i]].level)	Index = i;
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
	var displayMaps = function(maps, counts) {
		//Skip if no map
		if (maps == null) return;

		//Check count
		var Counts = counts;
		if (Counts == null) Counts = {};

		//For each map
		var MapList = "";
		for (var i = 0; i < maps.length; i++) {
			//Get data
			var Wiki	= "";
			var MapName = maps[i];
			var Count	= Counts[MapName];

			//If have a count
			if (Count != null && Count > 0) {
				//Extend string
				if (m_Maps[MapName].link != null) Wiki = ' href="' + m_Maps[MapName].link + '" title="' + MapName + ' - Guild Wars 2 Wiki" target="_blank"';
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

		//Checked or no?
		if (!element.checked)	m_AcquisitionFilter[element.value] = true;
		else					delete m_AcquisitionFilter[element.value];

		//Refresh
		saveCookies();
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
		var Encoded = m_Traits.encodeTraits(m_TraitUnlocks);

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
