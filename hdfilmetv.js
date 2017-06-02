/**
 * Movian plugin to watch hdfilme.tv streams 
 *
 * Copyright (C) 2017 BuXXe
 *
 *     This file is part of hdfilme.tv Movian plugin.
 *
 *  hdfilme.tv Movian plugin is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  hdfilme.tv Movian plugin is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with hdfilme.tv Movian plugin.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Download from : https://github.com/BuXXe/movian-serienstream-plugin
 *
 */
var html = require('showtime/html');

var seasonDescriptions = {};
var seasonImages = {};

(function(plugin) {

  var PLUGIN_PREFIX = "hdfilme.tv:"; 

  plugin.addURI(PLUGIN_PREFIX + ':SelectSeriesEpisode:(.*):(.*)', function(page, videoid, seasonnr) {
	    page.type = "directory";
	    page.metadata.title = "Springen zu Folge";
	    page.metadata.icon = Plugin.path + 'hdfilmetv.png';

		  var res = showtime.textDialog("Nach welcher Folge (dieser Staffel) soll gesucht werden?", true,true);
		  var noEntry = true;

bypassAntiBot(page);

		  // check for user abort
		  if(res.rejected)
		   res = showtime.textDialog("Nach welcher Folge (dieser Staffel) soll gesucht werden?", true,true);
		  else
		  {
		  	page.metadata.title += " " + res.input;
		  	var myMovieURL = getMovieURL(videoid, res.input);

		  	if (myMovieURL){
			  	page.appendItem( myMovieURL,
						    'video',
						    { title: seasonnr + " - Folge " + res.input,
        					  description: seasonDescriptions[videoid]
							});
		  	}

		  	else{
		  		page.appendPassiveItem('video', '', { title: 'Keine Suchergebnisse', description: "Es konnten keine Folgen gefunden werden. Womöglich sind die Folgen offline, oder nicht auf HDfilme.tv verfügbar." });
		  	}

        	page.appendItem(PLUGIN_PREFIX + ':SelectSeriesEpisode:' + videoid + ":" + seasonnr,'item',{ title: "Zu anderer Folge springen...",
        										description: "Geben Sie die Folgennummer ein um direkt zur Folge zu gelangen" });

		  }
  });


  // Series Handler: show series for given seasons link
  plugin.addURI(PLUGIN_PREFIX + ':SeriesSite:(.*):(.*):(.*)', function(page, videoid, episodeamount, seriesTitle, seasondescription) {
	  	page.loading = true;
	  	page.type = 'directory';
	  	page.metadata.icon = seasonImages[videoid]
	  	page.metadata.title = seriesTitle;
	  	var noEntry = true;

bypassAntiBot(page);

        page.appendItem(PLUGIN_PREFIX + ':SelectSeriesEpisode:' + videoid + ":" + seriesTitle,'item',{ title: "Springen zu Folge...",
        										description: "Geben Sie die Folgennummer ein um direkt zur Folge zu gelangen" });

		for (var i=1; i < episodeamount; i++){
			  var myMovieURL = getMovieURL(videoid, i );

			  if (myMovieURL){
			  	page.appendItem( myMovieURL,
						    'video',
						    { title: "Folge " + i,
        					  description: seasonDescriptions[videoid]
							});
			  	noEntry = false;
			  }		
		}

		if (noEntry){
			page.flush();
			page.appendPassiveItem('video', '', { title: 'Keine Suchergebnisse', description: "Es konnten keine Folgen gefunden werden. Womöglich sind die Folgen offline, oder nicht auf HDfilme.tv verfügbar." });
		}

		page.loading = false;

   });


  // Seasons Handler: show seasons
  plugin.addURI(PLUGIN_PREFIX + ':SeasonsSite:(.*)', function(page, SeriesName) {
	  	page.loading = true;
	  	page.type = 'directory';
	  	page.metadata.icon = Plugin.path + 'hdfilmetv.png';

		page.metadata.title = SeriesName;
bypassAntiBot(page);

		  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-search?key=" + SeriesName.replace(/\s/g, "+") , {
                        compression: true,
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());

		  var entries = "";
	      if (dom.root.getElementByClassName('products')[0]) {
			entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		  }

		  for(var k=0; k< entries.length; k++)
		  {
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;


			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  if (title.match(SeriesName)){

					if (entries[k].getElementByClassName('episode')[0]){
			  		
			  		var episodelimit = entries[k].getElementByClassName('episode')[0].textContent;

					episodelimit = episodelimit.substr(episodelimit.indexOf("/") + 2);

			  		title = title.replace(SeriesName,"");
			  		title = title.toLowerCase().replace("staffel", "Staffel");
			  		page.appendItem(PLUGIN_PREFIX + ':SeriesSite:' + videoid + ":" + episodelimit + ":" + SeriesName + " - " + title,
						    'video',
						    { title: title,
						      icon: entryimage,
        					  description: description
							});
			  		seasonDescriptions[videoid] = description;
			  		seasonImages[videoid] = entryimage;
			  	}
			  }

		  }

		page.loading = false;
	});
  
  // Shows a list of all series alphabetically 
  // Problem: The sorting takes too much time. But there is no faster way right now 
  // because the website only has genre sorted lists
  plugin.addURI(PLUGIN_PREFIX + ':BrowseSeries', function(page) {
	    page.type = "directory";
	    page.metadata.title = "Beliebte Serien auf HDfilme.tv";
	    page.metadata.icon = Plugin.path + 'hdfilmetv.png';

		bypassAntiBot(page);

		  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-series" , {
                        compression: true,
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());


		  var entries = "";
	          if (dom.root.getElementByClassName('products')[0]) {
				entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		 	  }

		  // First array is seriesid, second season, inside there goes the videoid for the season
		  var seriesEntries = [];
		  seasonDescriptions = {};
		  seasonImages = {};
		  for(var k=0; k< entries.length; k++)
		  {

			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;

			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  // Serie
			  if ( entries[k].getElementByClassName('episode')[0] ) {
			  	const myRegex = /.*(?= staffel \d+)/;

			  	var match = myRegex.exec(title);

			  	var titleid = title;

			  	if (match){
			  		title = match[0];
			  	}
			  	var title_nospace = title.replace(/\s/g, "");

			  	var episodelimit = entries[k].getElementByClassName('episode')[0].textContent;

			  	episodelimit = episodelimit.substr(episodelimit.indexOf("/") + 2);

				var regex2 = /(?=staffel ([^ \n]+))/g;

				// Serie mit Staffeln
				if (regex2.exec(titleid)){
parseInt(regex2.exec(titleid)[1]);
						var myMatch2 = parseInt(regex2.exec(titleid)[1]);

					  	if ( ! seriesEntries[title_nospace] ){
					  		page.appendItem(PLUGIN_PREFIX + ':SeasonsSite:'+ title , 'video', { 
				  					  title: title,
								      icon: entryimage,
		        					  description: description
									})
						}

						if (myMatch2){
							if (!seriesEntries[title_nospace]){
								seriesEntries[title_nospace] = [];
							}
							seriesEntries[title_nospace] = true;
						}
				}
				// Serie ohne Staffeln
				else {
					page.appendItem(PLUGIN_PREFIX + ':SeriesSite:' + videoid + ":" + episodelimit + ":" + titleid,
						    'video',
						    { title: titleid,
						      icon: entryimage,
        					  description: description
							});
			  		seasonDescriptions[videoid] = description;
			  		seasonImages[videoid] = entryimage;
				}
			  }
			}
  });

  plugin.addURI(PLUGIN_PREFIX + ':BrowseMovies', function(page) {
	  page.type="directory";
	  page.metadata.icon = Plugin.path + 'hdfilmetv.png';

		  page.metadata.title = "Beliebte Filme auf HDfilme.tv";
		  var noEntry = true;
		  
		  bypassAntiBot(page);

		  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-movies?cat=&country=&order_f=view&order_d=desc#" , {
                        compression: true,
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());

		  var entries = "";
	          if (dom.root.getElementByClassName('products')[0]) {
			entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		  }


		  for(var k=0; k< entries.length; k++)
		  {

			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;


			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  var episodeid = 1;

			  var myMovieURL = getMovieURL(videoid, episodeid );

			  if (myMovieURL){
			  	page.appendItem( myMovieURL,
						    'video',
						    { title: title,
						      icon: entryimage,
        					  description: description
							});
			  	noEntry=false;
			  }
		  }
		  		  
		  if(noEntry == true)
		  		page.appendPassiveItem('video', '', { title: 'Keine Suchergebnisse', description: "Es konnte keine Serie oder Film gefunden werden. Womöglich ist der Inhalt offline oder nicht auf HDfilme.tv verfügbar." });
		  
		page.loading = false;
  });
  
  //Search param indicates the search criteria: Artist, Album, Track
  plugin.addURI(PLUGIN_PREFIX+":Search:(.*)", function(page, resInput) {
	  page.type="directory";
	  page.metadata.icon = Plugin.path + 'hdfilmetv.png';
	  
		  page.metadata.title = "Filme/Serien Suche: "+ resInput;
		  var noEntry = true;
		  
		  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-search?key=" + resInput.replace(/\s/g, "+") , {
                        compression: true,
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());


		  var entries = "";
	          if (dom.root.getElementByClassName('products')[0]) {
			entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		  }

		  // First array is seriesid, second season, inside there goes the videoid for the season
		  var seriesEntries = [];
		  seasonDescriptions = {};
		  seasonImages = {};
		  for(var k=0; k< entries.length; k++)
		  {

			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;

			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  // Serie
			  if ( entries[k].getElementByClassName('episode')[0] ) {
			  	const myRegex = /.*(?= staffel \d+)/;

			  	var match = myRegex.exec(title);

			  	var titleid = title;

			  	if (match){
			  		title = match[0];
			  	}
			  	var title_nospace = title.replace(/\s/g, "");

			  	var episodelimit = entries[k].getElementByClassName('episode')[0].textContent;

			  	episodelimit = episodelimit.substr(episodelimit.indexOf("/") + 2);

				var regex2 = /(?=staffel ([^ \n]+))/g;

				// Serie mit Staffeln
				if (regex2.exec(titleid)){

						var myMatch2 = parseInt(regex2.exec(titleid)[1]);

					  	if ( ! seriesEntries[title_nospace] ){
					  		page.appendItem(PLUGIN_PREFIX + ':SeasonsSite:'+ title , 'video', { 
				  					  title: title,
								      icon: entryimage,
		        					  description: description
									})
						}

						if (myMatch2){
							if (!seriesEntries[title_nospace]){
								seriesEntries[title_nospace] = [];
							}
							seriesEntries[title_nospace] = true;
						}
				}
				// Serie ohne Staffeln
				else {
					page.appendItem(PLUGIN_PREFIX + ':SeriesSite:' + videoid + ":" + episodelimit + ":" + titleid,
						    'video',
						    { title: titleid,
						      icon: entryimage,
        					  description: description
							});
			  		seasonDescriptions[videoid] = description;
			  		seasonImages[videoid] = entryimage;
				}
			  }
			  // Filme
			  else {
			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  var episodeid = 1;

			  var myMovieURL = getMovieURL(videoid, episodeid );

			  if (myMovieURL){
			  	page.appendItem( myMovieURL,
						    'video',
						    { title: title,
						      icon: entryimage,
        					  description: description
							});
			  }


			  }

			  noEntry=false;
		  }
		  		  
		  if(noEntry == true)
		  		page.appendPassiveItem('video', '', { title: 'Keine Suchergebnisse', description: "Es konnte keine Serie oder Film gefunden werden. Womöglich ist der Inhalt offline oder nicht auf HDfilme.tv verfügbar." });
		  
		page.loading = false;

  });

  function bypassAntiBot(page){

	var BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie/getlink/3423432/1", {
		            compression: true,
		            noFail: true,
		            debug: false,
		        });

		if (BrowseResponse.statuscode == 503){
			page.flush();
		  	page.loading = true;
		  	page.appendPassiveItem('video', '', { title: 'Bitte kurz warten...', description: "Anti-Bot Dienste richten sich gegen DDoS Angriffe: Mehrere Computer greifen dabei gleichzeitig eine Webseite an. Dies kann sehr schnell zum Ausfall der Server führen." });

		   var dom = html.parse(BrowseResponse.toString());

					var url = "";
					if (BrowseResponse.headers["Refresh"]){
						url=BrowseResponse.headers["Refresh"].substr(6);
					}

					setTimeout(function(){
						            BrowseResponse = showtime.httpReq("http://hdfilme.tv"+url, {
						                compression: true,
						                noFail: true,
						                debug: false,
						            });
						        },7000);

					for (var i = 0; i <= 10; i++) {
						    showtime.notify("Warten auf Umgehen des Antibot Schutz... " + (11-i).toString() +" Sekunden verbleiben",1);
							showtime.sleep(1);
					}
					page.flush();
					page.loading = false;

		}
	  }

  function encode_utf8(s) {
	  return encodeURI(s);
	}

  function decode_utf8(s) {
	  return decodeURI(s);
	}

  function getMovieURL(id, episode) { 

  		var link = "http://hdfilme.tv/movie/getlink/"+id+"/"+episode;
		var myJSON = showtime.JSONDecode(String(Duktape.dec('base64', showtime.httpReq(link,{compression: true,noFollow:false,method: "GET"}).toString())));
		
		var myURL = "";
		if (myJSON){
			if (myJSON.playinfo){
				if (myJSON.playinfo[0]){
					 myURL = myJSON.playinfo[0].file;

					 return myURL;
				}
				else return false;
			}
		}
		
	}


  // Register a service (will appear on home page)
  var service = plugin.createService("HDfilme.tv", PLUGIN_PREFIX+"start", "video", true, plugin.path + "hdfilmetv.png");
  
  // Genre Search Handler
  plugin.addURI(PLUGIN_PREFIX+":GenreSearcher:(.*):(.*):(.*)", function(page, type, category, categoryTranslate) {
    page.type = "directory";
    page.metadata.icon = Plugin.path + 'hdfilmetv.png';
    page.metadata.title = categoryTranslate + "-" + type;

	bypassAntiBot(page);

	if (type == "Serien"){
				  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-series?cat="
          					+ category +
          					"&country=&order_f=view&order_d=desc#" , {
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());


		  var entries = "";
	          if (dom.root.getElementByClassName('products')[0]) {
				entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		 	  }

		  // First array is seriesid, second season, inside there goes the videoid for the season
		  var seriesEntries = [];
		  seasonDescriptions = {};
		  seasonImages = {};
		  for(var k=0; k< entries.length; k++)
		  {

			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;

			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  // Serie
			  if ( entries[k].getElementByClassName('episode')[0] ) {
			  	const myRegex = /.*(?= staffel \d+)/;

			  	var match = myRegex.exec(title);

			  	var titleid = title;

			  	if (match){
			  		title = match[0];
			  	}
			  	var title_nospace = title.replace(/\s/g, "");

			  	var episodelimit = entries[k].getElementByClassName('episode')[0].textContent;

			  	episodelimit = episodelimit.substr(episodelimit.indexOf("/") + 2);

				var regex2 = /(?=staffel ([^ \n]+))/g;

				// Serie mit Staffeln
				if (regex2.exec(titleid)){

						var myMatch2 = parseInt(regex2.exec(titleid)[1]);

					  	if ( ! seriesEntries[title_nospace] ){
					  		page.appendItem(PLUGIN_PREFIX + ':SeasonsSite:'+ title , 'video', { 
				  					  title: title,
								      icon: entryimage,
		        					  description: description
									})
						}

						if (myMatch2){
							if (!seriesEntries[title_nospace]){
								seriesEntries[title_nospace] = [];
							}
							seriesEntries[title_nospace] = true;
						}
				}
				// Serie ohne Staffeln
				else {
					page.appendItem(PLUGIN_PREFIX + ':SeriesSite:' + videoid + ":" + episodelimit + ":" + titleid,
						    'video',
						    { title: titleid,
						      icon: entryimage,
        					  description: description
							});
			  		seasonDescriptions[videoid] = description;
			  		seasonImages[videoid] = entryimage;
				}
			  }
			}
	}

	else if (type == "Filme") {
		  var BrowseResponse = ""; 

          BrowseResponse = showtime.httpReq("http://hdfilme.tv/movie-movies?cat="
          					+ category +
          					"&country=&order_f=view&order_d=desc#" , {
                        compression: true,
                        noFail: true,
                        debug: false,
                    });

		  var dom = html.parse(BrowseResponse.toString());

		  var entries = "";
	          if (dom.root.getElementByClassName('products')[0]) {
			entries =  dom.root.getElementByClassName('products')[0].getElementByTagName("li");
		  }


		  for(var k=0; k< entries.length; k++)
		  {

			  var ancor = entries[k].getElementByTagName("a")[0];
			  var title = entries[k].getElementByClassName('title-product')[0].textContent;
			  
			  var entryimage = entries[k].getElementByClassName('img')[0].attributes.getNamedItem("src").value.replace("_thumb","");
			  var description = dom.root.getElementByClassName('popover-content')[k].getElementByTagName("p")[0].textContent;


			  var videoid = entries[k].getElementByClassName('box-product')[0].attributes.getNamedItem("data-popover").value;

			  videoid = videoid.replace('movie-data-popover-',"");

			  var episodeid = 1;

			  var myMovieURL = getMovieURL(videoid, episodeid );

			  if (myMovieURL){
			  	page.appendItem( myMovieURL,
						    'video',
						    { title: title,
						      icon: entryimage,
        					  description: description
							});
			  	noEntry=false;
			  }

			  
		  }
		  		  
		  if(noEntry == true)
		  		page.appendPassiveItem('video', '', { title: 'Keine Suchergebnisse', description: "Es konnte keine Serie oder Film gefunden werden. Womöglich ist der Inhalt offline oder nicht auf HDfilme.tv verfügbar." });
		  
		page.loading = false;
	}


  });


  // Genre Handler
  plugin.addURI(PLUGIN_PREFIX+":GenresHandler:(.*)", function(page, type) {
    page.type = "directory";
    page.metadata.icon = Plugin.path + 'hdfilmetv.png';
    page.metadata.title = "Bitte " + type + "genre wählen";

    var imagePrefix = "http://hdfilme.tv/upload/public/";

	var genreImages = ["4539a0d9f6e6de3f5e4c5ee3d46ae60e.jpg", "d9b5eb8e6bf23ce07938595475cd3341.jpg",
					   "58d096ea763dde2b45824401057bd8e0.jpg", "4a0ebffc53e2a72417788fc329869219.jpg",
					   "5eeb2f2de6e3d079bcd61af04bb9ad9e.jpg", "716e2dd1031fbb513dc2a0e72f81137f.jpg",
					   "1b119b8d903c9cc6d346aa7d5b3cf90c.jpg",
					   "21ccc8393085b51138d89c8e8083e3e2.jpg","21560e83923935d8812f61fde16002db.jpg"]

	var showableGenres = [73, 71, 74, 66, 78, 69, 65, 60, 83];

	var showableGenresTranslation = ["Action", "Komödien", "Animation",
									 "Fantasy", "Kriminal","Horror", "Familien",
									 "Biografie" , "Romantik"];

	bypassAntiBot(page);

	for (var i=0; i < showableGenres.length;i++){
		page.appendItem(PLUGIN_PREFIX + ":GenreSearcher:" + type + ":" + showableGenres[i] + ":" + showableGenresTranslation[i],
										"item",
										{ title: showableGenresTranslation[i],
										  icon: imagePrefix + genreImages[i]
										});
	}

  });

  // Register Start Page
  plugin.addURI(PLUGIN_PREFIX+"start", function(page) {
    page.type = "directory";
    page.metadata.icon = Plugin.path + 'hdfilmetv.png';
    page.metadata.title = "HDfilme.tv Hauptmenü";

	
	bypassAntiBot(page);

	page.appendItem(PLUGIN_PREFIX + ":Search:", 'search', {
	    title: 'Suchen Sie hier nach Ihrer Lieblingsserie oder Ihrem Lieblingsfilm'
	});
	page.appendItem(PLUGIN_PREFIX + ':BrowseSeries', 'directory',{title: "Aktuelle Serien anzeigen"});
    page.appendItem(PLUGIN_PREFIX + ':BrowseMovies', 'directory',{title: "Aktuelle Filme anzeigen"});
    page.appendItem(PLUGIN_PREFIX + ':GenresHandler:Serien', 'directory',{title: "Serien nach Genre anzeigen"});
    page.appendItem(PLUGIN_PREFIX + ':GenresHandler:Filme', 'directory',{title: "Filme nach Genre anzeigen"});

	page.loading = false;


  });

})(this);