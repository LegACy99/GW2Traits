/* jshint eqnull:true			*/
/* exported TraitManager		*/

var TraitManager = function() {
	//Members
	var m_Traits	= {};
	var m_TraitList	= [];

	//Constants
	var TIER_ORDER			= [ "rSjaATHNVp", "4Q9BEZ8SgU", "i2XMdWvaNI" ];
	var NUMBER_ORDER		= [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV" ];
	var ENCODING_ALPHABET	= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	var ENCODING_CHUNK_SIZE	= 6;

	var getIDs = function() {
		//Return list of traits
		return m_TraitList;
	};

	//
	var getStructuredIDs = function() {
		//Initialize
		var Result = [];
		for (var i = 0; i < m_TraitList.length; i++) {
			//Get trait
			var Trait = m_Traits[m_TraitList[i]];

			//Get row array
			if (Result[Trait.line - 1] == null) Result[Trait.line - 1] = [];
			var Row = Result[Trait.line - 1];

			//Get index
			var Index = 0;
			while (Index < NUMBER_ORDER.length && Trait.number != NUMBER_ORDER[Index]) Index++;

			//Get tier
			var Tier = 0;
			if (Index >= 10)	{ Tier = 2; Index -= 10;	}
			if (Index >= 6)		{ Tier = 1; Index -= 6;		}
			if (Row[Tier] == null) Row[Tier] = [];
			var TraitTier = Row[Tier];

			//Save
			TraitTier[Index] = m_TraitList[i];
		}

		//Return
		return Result;
	};

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
			//If a valid key
			if (m_Traits.hasOwnProperty(ID)) {
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
		}

		//Return
		return Result;
	};

	//Exporting
	var setTraits = function(traits) {
		//Skip if no traits
		if (traits == null) return;

		//Initialize
		m_Traits	= {};
		var MaxRow	= 0;

		//For each trait
		var i = 0;
		for (i = 0; i < traits.length; i++) {
			//Initialize data
			var Trait = {
				line: 1,
				map: null,
				tier: null,
				number: null,
				acquisition: null
			};

			//Read data
			var Map			= traits[i].get("map");
			var Line		= traits[i].get("line");
			var Tier		= traits[i].get("tier");
			var Numba		= traits[i].get("number");
			var Acquisition = traits[i].get("acquisition").id;
			if (Map != null && Map.get("name") != null)	Trait.map = Map.get("name");
			if (Acquisition != null)					Trait.acquisition = Acquisition;
			if (Tier != null)							Trait.tier = Tier;
			if (Line != null)							Trait.line = Line;

			//If there's number
			if (Numba != null) {
				//Save
				Trait.number = Numba;

				//Get order
				var Order = 0;
				while (Order < NUMBER_ORDER.length && Numba != NUMBER_ORDER[Order]) Order++;
				if (Order + 1 > MaxRow) MaxRow = Order + 1;
			}

			//Save
			m_Traits[traits[i].id] = Trait;
		}

		//For each trait
		var TraitList = [];
		for (var ID in m_Traits) {
			//If valid key
			if (m_Traits.hasOwnProperty(ID)) {
				//If trait has a number
				if (m_Traits[ID].number != null) {
					//Get index
					var Index = 0;
					while (Index < NUMBER_ORDER.length && m_Traits[ID].number != NUMBER_ORDER[Index]) Index++;
					Index += (m_Traits[ID].line - 1) * MaxRow;

					//Save
					TraitList[Index] = ID;
				}
			}
		}

		//Save without gap
		m_TraitList = [];
		for (i = 0; i < TraitList.length; i++) if (TraitList[i] != null) m_TraitList.push(TraitList[i]);
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

			//For each trait
			Index = 0;
			for (var ID in m_Traits) {
				//If valid
				if (m_Traits.hasOwnProperty(ID)) {
					//Save
					if (Traits[Index]) Result[ID] = true;
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
};
