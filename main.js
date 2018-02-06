window.App = {}
window.App.templates = {}

function exchanger(currentCurrency, currenciesMapping) {
  var upperCurrentCurrency = currentCurrency.toUpperCase();

  return {
    to: function(value, OfferCurrency) {
      if (value == 0) {
        return 0
      }

      if (!OfferCurrency) {
        throw new Error("Unknown OfferCurrency")
      }

      var upperOfferCurrency = OfferCurrency.toUpperCase();

      if (upperCurrentCurrency == upperOfferCurrency) {
        return value
      }

      var roe = currenciesMapping[upperOfferCurrency][upperCurrentCurrency]

      result = roe * value;

      return Math.round(result * 100) / 100
    }
  }
}

function getMinMoney(offer) {
  return offer.cc_min_money;
  // return window.App.exchanger.to(offer.min_money, offer.currency)
}

function getMaxMoney(offer) {
  return offer.cc_max_money;
  // return window.App.exchanger.to(offer.max_money, offer.currency)
}

function selectOffersWithMax(offers) {
  return _.select(offers, function(offer) { return offer.cc_max_money > 0 })
}

function selectOffersWithMin(offers) {
  return _.select(offers, function(offer) { return offer.cc_min_money > 0 })
}

function selectOffersWithMinOrMax(offers) {
  return _.select(offers, function(offer) { return offer.cc_min_money > 0 || offer.cc_max_money > 0})
}

function selectOffersWithCity(offers, city) {
  return _.select(offers, function(offer) { return offer.city == city });
}

function selectOffersWithTag(offers, tag) {
  return _.select(offers, function(offer) { return _.include(offer.tags, tag) });
}

function sortKeys(obj, comparator) {
  var keys = _.sortBy(_.keys(obj), function (key) {
      return comparator ? comparator(obj[key], key) : key;
  });

  return _.object(keys, _.map(keys, function (key) {
    return obj[key];
  }));
};

// max money come first
function sortByMax(offers) {
  return _.sortBy(offers, function(offer) { return -offer.cc_max_money });
}

// min money come first
function sortByMin(offers) {
  return _.sortBy(offers, function(offer) { return offer.cc_min_money });
}

function getCityToOffersCountMapping(allLanguagesData) {
  var cities = {}

  _.each(allLanguagesData, function(languageData) {
    _.each(languageData.city_to_offers_number, function(numbers, city) {
      if (!cities[city]) {
        cities[city] = 0;
      }

      cities[city] += numbers;
    })
  })

  return sortKeys(cities, function(count) { return -count;});
}

function getTagToOffersCountMapping(languageData, city) {
  if (city == 'any') {
    var topTagsMapping = languageData.top.tags
  } else {
    var topTagsMapping = {}

    _.each(languageData.selectedCityOffers, function(offer) {
      _.each(offer.tags, function(tag) {
        if (!topTagsMapping[tag]) {
          topTagsMapping[tag] = 0
        }

        topTagsMapping[tag] += 1
      })
    });
  }

  return sortKeys(topTagsMapping, function(count) { return -count; })
}

function findLanguageData(items, language) {
  log("Looking for " + language);

  var item = _.find(items, function(item) { return item.name == language; })

  log("found:");
  log(item);

  return item;
}

function salaryRangeText(offersByMin, offersByMax) {
  if (offersByMin[0] && offersByMin[0].cc_min_money > 0) {
    var minMoney = getMinMoney(offersByMin[0]);
    var maxMoney = getMaxMoney(offersByMax[0]);

    return minMoney + " - " + maxMoney + " " + window.App.currency;
  } else {
    if (offersByMax[0] && offersByMax[0].cc_max_money > 0) {
      var maxMoney = getMaxMoney(offersByMax[0]);

      return "up to " + maxMoney + " " + window.App.currency;
    } else {
      return "no info";
    }
  }
}

function log(object) {
  if (console && console.log) {
    console.log(object);
  }
}

function getTemplate(name) {
  if (window.App.templates[name]) {
    return window.App.templates[name];
  }

  window.App.templates[name] = _.template(document.getElementById(name).innerHTML)
  return window.App.templates[name]
}

function renderTemplate(elementId, templateName, data) {
  var template = getTemplate(templateName);
  var html     = template(data)
  document.getElementById(elementId).innerHTML = html;
}

function renderMostPopularTags(languageData, city) {
  var mapping = getTagToOffersCountMapping(languageData, city)

  var displayItems = _.map(mapping, function(count, name) {
    var offers        = languageData.selectedCityOffers
    var offersWithTag = selectOffersWithTag(offers, name);

    return (
      {
        tag: name,
        count: count,
        money: salaryRangeText(sortByMin(offersWithTag), sortByMax(offersWithTag))
      }
    )
  });

  renderTemplate('mostPopularTechnologies', 'mostPopularTechnologiesTemplate', { items: _.take(displayItems, 10) });
}

function renderLanguageMostPopularCities(languageData, city){
  var displayItems = []

  if (city == 'any') {
    var topCitiesMapping = sortKeys(languageData.top.cities, function(count) { return -count; });

    _.each(topCitiesMapping, function(count, name) {
      var offers = selectOffersWithCity(languageData.selectedCityOffers, name)

      displayItems.push(
        {
          location: name,
          count: count,
          money: salaryRangeText(sortByMin(offers), sortByMax(offers))
        }
      )
    });
  }

  var data = {
    city: city,
    items: displayItems
  }

  renderTemplate('mostPopularCities', 'mostPopularCitiesTemplate', data);
}

function renderTimestamp(timestamp) {
  document.getElementById("lastUpdate").innerHTML = window.timestamp;
}

function renderLinks(languageData, city) {
  var data = {
    name: languageData.name,
    city: city
  }

  renderTemplate('links', 'linksTemplate', data)
}

function renderLanguageSummary(languageData, city) {
  var offers                = languageData.selectedCityOffers
  var howManyProvidedSalary = selectOffersWithMinOrMax(offers).length;
  var offersWithMax         = selectOffersWithMax(offers);
  var offersWithMin         = selectOffersWithMin(offers);
  var min                   = null;
  var max                   = null;

  if (offersWithMin.length == 0) {
    offersWithMin = offersWithMax
  }

  if (offersWithMin.length > 0) {
    var minOffer = sortByMin(offersWithMin)[0];

    min = getMinMoney(minOffer);
  }

  if (offersWithMax.length > 0) {
    var maxOffer = sortByMax(offersWithMax)[0]

    max = getMaxMoney(maxOffer);
  }

  var percentage = 0;
  if (offers.length > 0) {
    percentage = Math.round(((howManyProvidedSalary * 100) / offers.length))
  }

  withSalaryCount = howManyProvidedSalary + " (" + percentage + "%)"

  var data = {
    count: offers.length,
    withSalaryCount: withSalaryCount,
    min: min,
    max: max
  }

  renderTemplate('languageSummary', 'languageSummaryTemplate', data)
}

function renderBestOffers(languageData, city) {
  var allOffers = languageData.selectedCityOffers;
  var offers    = selectOffersWithMinOrMax(allOffers)

  if (offers.length == 0) {
    offers = allOffers
  }

  var displayItems = _.map(offers, function(offer) {
    var texts = []

    if (city == 'any') {
      texts.push(offer.city)
    }

    texts.push(_.select(offer.tags, function(tag) { return tag != languageData.name }).join(", "))

    return {
      money: salaryRangeText([offer], [offer]),
      link: offer.link,
      text: texts.join("; ")
    }
  })

  renderTemplate('bestOffers', 'bestOffersTemplate', { items: _.take(displayItems, 15) });
}

function renderCitiesSelect(allLanguagesData) {
  var displayItems = [{ value: "any", name: "Any Location" }];
  var mapping      = getCityToOffersCountMapping(allLanguagesData);

  _.each(mapping, function(count, city) {
    displayItems.push({ name: city, value: city })
  });

  renderTemplate('cities', 'citiesTemplate', { items: displayItems });
}

function renderCurrenciesSelect(currenciesMapping) {
  var displayItems = [{ value: "PLN", name: "PLN" }]

  _.each(currenciesMapping, function(roe, currency) {
    if (currency != 'PLN') {
      displayItems.push({ name: currency, value: currency })
    }
  });

  renderTemplate('currencies', 'currenciesTemplate', { items: displayItems });
}

function renderLanguagesSelect(allLanguagesData) {
  var sorted = _.sortBy(allLanguagesData, function(languageData) { return -languageData.offers.length })

  var displayItems = _.map(sorted, function(languageData) {
    return { value: languageData.name, name: languageData.name }
  })

  renderTemplate('languages', 'languagesTemplate', { items: displayItems })
}

function render() {
  log("rendering");
  var languageData = findLanguageData(window.App.json, window.App.language)

  assignSelectedCityOffers()
  recalculatePricesAfterCurrencyChange()

  renderTimestamp(window.timestamp);
  renderLinks(languageData, window.App.city)
  renderLanguageSummary(languageData, window.App.city);
  renderBestOffers(languageData, window.App.city);
  renderLanguageMostPopularCities(languageData, window.App.city);
  renderMostPopularTags(languageData, window.App.city);
}

function assignSelectedCityOffers() {
  var languageData = findLanguageData(window.App.json, window.App.language)

  if (window.App.city == 'any') {
    languageData.selectedCityOffers = languageData.offers
  } else {
    languageData.selectedCityOffers = selectOffersWithCity(languageData.offers, window.App.city)
  }
}

function recalculatePricesAfterCurrencyChange() {
  _.each(window.App.json, function(languageData) {
    _.each(languageData.selectedCityOffers, function(offer) {
      log(offer)
      offer.cc_min_money = window.App.exchanger.to(offer.provider_min_money, offer.provider_currency)
      offer.cc_max_money = window.App.exchanger.to(offer.provider_max_money, offer.provider_currency)
    });
  });
}

function selectLanguage(languageName) {
  log("Selecting new language: " + languageName);

  window.App.language = languageName;

  render()
}

function selectCity(city) {
  log("Selecting new city: " + city);

  window.App.city = city;

  render()
}

function selectCurrency(currency) {
  log("Selecting new currency: " + currency);

  window.App.currency = currency;
  window.App.exchanger = exchanger(window.App.currency, window.App.currencies)

  render()
}

document.addEventListener("DOMContentLoaded", function() {
  window.App.json = JSON.parse(window.json)
  window.App.currencies = JSON.parse(window.currencies)

  renderLanguagesSelect(window.App.json)
  renderCitiesSelect(window.App.json);
  renderCurrenciesSelect(window.App.currencies);

  languagesSelect = document.getElementById("languages");
  languagesSelect.addEventListener("change", function(event) {
    selectLanguage(event.target.value);
  });

  citiesSelect = document.getElementById("cities");
  citiesSelect.addEventListener("change", function(event) {
    selectCity(event.target.value);
  });

  currenciesSelect = document.getElementById("currencies");
  currenciesSelect.addEventListener("change", function(event) {
    selectCurrency(event.target.value);
  });

  window.App.language  = languagesSelect.children[0].value
  window.App.city      = citiesSelect.children[0].value
  window.App.currency  = currenciesSelect.children[0].value
  window.App.exchanger = exchanger(window.App.currency, window.App.currencies)

  render()
});