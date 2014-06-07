/*jshint eqnull:true */

var TraitManager = function() {
	//Members
	var m_Traits = {};

	//Constants
	var MAP					= "map";
	var NUMBER				= "number";
	var ACQUISITION			= "acquisition";
	var ENCODING_ALPHABET	= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	var ENCODING_CHUNK_SIZE	= 6;

	var getTraitIDs = function() {
		//Create array
		var Result = [];
		for (var ID in m_Traits) if (m_Traits.hasOwnProperty(ID)) Result.push(ID);
		
		//Return
		return Result;
	}

	var getTraitNumber = function(id) {
		//Get
		var Result = null;
		if (id != null && m_Traits[id] != null) Result = m_Traits[id].number;

		//Return
		return Result;
	};

	var getTraitAcquisition = function(id) {
		//Get
		var Result = null;
		if (id != null && m_Traits[id] != null) Result = m_Traits[id].acquisition;

		//Return
		return Result;
	};

	var getTraitMap = function(id) {
		//Get
		var Result = null;
		if (id != null && m_Traits[id] != null) Result = m_Traits[id].map;

		//Return
		return Result;
	};

	var encodeTraits = function(unlocks) {
		//Initialize
		var Count			= 0;
		var Empty			= 0;
		var TraitsValue		= 0;
		var TraitsFactor	= 1;
		var Result			= "";

		//For each trait
		for (var ID in m_Traits) {
			//Skip if not key
			if (!m_Traits.hasOwnProperty(ID)) continue;

			//Save
			if (unlocks != null && unlocks[ID] != null && unlocks[ID]) TraitsValue += TraitsFactor;
			TraitsFactor *= 2;

			//Check if chunk size reached
			Count++;
			if (Count >= ENCODING_CHUNK_SIZE || (Count == ENCODING_CHUNK_SIZE - 1 && Result.length + Empty == 10)) {
				//If nothing, don't do anything
				if (TraitsValue === 0) Empty++;
				else {
					//Append the corresponding character
					for (var i = 0; i < Empty; i++) Result = ENCODING_ALPHABET.charAt(0) + Result;
					Result = ENCODING_ALPHABET.charAt(TraitsValue) + Result;
					Empty = 0;
				}

				//Reset
				Count			= 0;
				TraitsValue		= 0;
				TraitsFactor	= 1;
			}
		}

		//Return
		return Result;
	};	

	//Exporting
	var setTraits = function(traits) {
		//Skip if no traits
		if (traits == null) return;

		//For each trait
		for (i = 0; i < traits.length; i++) {
			//Initialize data
			var Trait = {
				map: null,
				number: 0,
				acquisition: null
			};

			//Read data
			var Map			= traits[i].get("map");
			var Num			= traits[i].get("number");
			var Acquisition = traits[i].get("acquisition").id;
			if (Num != null) 							Trait.number = Num;
			if (Acquisition != null) 					Trait.acquisition = Acquisition;
			if (Map != null && Map.get("name") != null)	Trait.map = Map.get("name");

			//Save
			m_Traits[traits[i].id] = Trait;
		}
	};

	var decodeTraits = function(traits) {
		//Initialize
		var Result = {};
		if (traits != null && traits.length > 0) {
			//Initialize
			var i		= 0;
			var Min		= 0;
			var Index	= 0;
			if (traits.length > 11) Min = traits.length - 11;

			//Get IDs
			var Traits = [];
			for (i = 0; i < Object.keys(m_Traits).length; i++) Traits.push(false);

			//For each character
			for (i = traits.length - 1; i >= Min; i--) {
				//Get value
				var Char	= traits.charAt(i);
				var Value	= ENCODING_ALPHABET.indexOf("" + Char);
				if (Value >= ENCODING_ALPHABET.length)	Value = ENCODING_ALPHABET - 1;
				if (Value < 0)							Value = 0;

				//While
				var Offset = ENCODING_CHUNK_SIZE - 1;
				var Factor = Math.pow(2, Offset);
				while (Offset >= 0) {
					//If true for that factor
					if (Value >= Factor) {
						//Remove from value
						Value -= Factor;

						//Check index
						Index = ((traits.length - 1 - i) * ENCODING_CHUNK_SIZE) + Offset;
						if (Index < Traits.length) Traits[Index] = true;
					}

					//Reduce
					Factor /= 2;
					Offset--;
				}
			}

			//Save
			Index = 0;
			for (var ID in m_Traits) {
				//If valid
				if (m_Traits.hasOwnProperty(ID)) {
					//Save
					Result[ID] = Traits[Index];
					Index++;
				}
			}
		}

		//Return
		return Result;
	};

	//Return public members
	return {
		getTraitIDs: getTraitIDs,
		getTraitMap: getTraitMap,
		getTraitNumber: getTraitNumber,
		getTraitAcquisition: getTraitAcquisition,
		encodeTraits: encodeTraits,
		decodeTraits: decodeTraits,
		setTraits: setTraits
	};
}();
