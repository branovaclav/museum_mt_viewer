var config = {
	screenWidth: 1920,
	screenHeight: 1080,
	frameWidth: 1880,
	tileWidth: 380,
	tileMargin: 40,
	viewportMargin: 20,
	slideshowDelay: 6,
	activityDelay: 60

};

var Kiosk = {
	toggleScreen: function(screen) {
		this.screen = this.screen || $();
		this.screen.hide();
		if (this.screen.is(this.screens.slideshow)) {
			clearTimeout(this.timer);
			this.slides.empty();
		}

		this.screen = this.screens[screen].show();
		this.toolbar.removeClass().addClass('toolbar ' + screen);

		if (this.screen.is(this.screens.slideshow))
			this.generateSlides();

		if (this.screen.is(this.screens.home))
			this.index = undefined;

		if (this.screen.is(this.screens.list)) {
			var image = this.grid.find('.image').filter(function (i, image) {
				return $(image).data().index == this.index;
			}.bind(this));
			if (image.length)
				$(document).scrollLeft(image.position().left - (config.tileWidth + config.tileMargin + config.viewportMargin - 4));
		}
	},

	generateSlides: function () {
		this.slideimages = $.grep(this.data, function (image) {
			return $.inArray('wide', image.tags.split(',')) >= 0
		});

		var slidehtml = '<li class="slide"></li>';
		this.slides.append($(slidehtml)).append($(slidehtml));

		var nextSlide = function (index) {
			this.slides.children().first().remove();
			this.slides.append($(slidehtml).css({ 'background-image': 'url(/data/images/' + this.slideimages[index].file + ')' }));
			this.timer = setTimeout(function () { nextSlide((index + 1) % this.slideimages.length); }.bind(this), config.slideshowDelay * 1000);
		}.bind(this);

		nextSlide(0);
	},

	generateGrid: function(tag) {
		this.images = $.grep(this.data, function (image) {
			return $.inArray(tag, image.tags.split(',')) >= 0
		}).sort(function (a, b) {
			if (a[this.locale].toLowerCase() < b[this.locale].toLowerCase()) return -1;
			if (a[this.locale].toLowerCase() > b[this.locale].toLowerCase()) return 1;
		    return 0;
		}.bind(this));

		this.grid.empty();
		var tilecount = [0, 0];
		$.each(this.images, function (i, image) {
			image.index = i;
			var aspect = $.grep(image.tags.split(','), function (tag) {
				return (tag == 'wide' || tag == 'high');
			})[0];
			var tile = $('<li></li>').addClass('tile ' + (aspect ? aspect : 'square')).appendTo(this.grid);
			var link = $('<a></a>').addClass('image').data({ index: image.index })
				.css({ 'background-image': 'url(/data/images/thumbnails/' + image.file + ')' }).appendTo(tile)
				.on('click', this.showDetail.bind(this));
			var label = $('<label></label>').text(image[this.locale]).appendTo(tile);

			if (aspect == 'high')
				tilecount[0] = tilecount[1] = Math.max(tilecount[0], tilecount[1]);
			var diff = tilecount[0] - tilecount[1];
			var offset = { x: Math.abs(diff), y: (diff > 0) ? 1 : 0 };
			tile.addClass('offset').addClass('x' + offset.x).addClass('y' + offset.y);

			tilecount[offset.y] += tile.hasClass('wide') ? 2 : 1;
			if (aspect == 'high')
				tilecount[1 - offset.y] += 1;
		}.bind(this));
		this.grid.width(Math.max(tilecount[0], tilecount[1]) * config.tileWidth + config.tileMargin);
	},

	generateFrames: function (index, direction) {
		var images = [];
		if (direction) {
			index = this.index;
			var newindex = index + (direction * 2);
			var oldindex = index - direction;
			if (newindex >= 0 && newindex < this.images.length)
				images.push(this.images[newindex]);
			this.frames.find('.tile').filter(function () {
				return $(this).data().index == oldindex;
			}).remove();
		}
		else {
			var indexes = [Math.max(0, index - 1), Math.min(index + 1, this.images.length - 1)];
			images = this.images.slice(indexes[0], indexes[1] + 1);
			this.frames.empty();
		}

		$.each(images, function (i, image) {
			var action = direction < 0 ? 'prependTo' : 'appendTo';
			var tile = $('<li></li>').addClass('tile').data({ index: image.index })
				.css({ 'background-image': 'url(/data/images/thumbnails/' + image.file + ')' })[action](this.frames);
			var link = $('<a></a>').addClass('image')
				.css({ 'background-image': 'url(/data/images/' + image.file + ')' }).appendTo(tile)
				.on('click', function () { this.toolbar.toggleClass('hidden'); }.bind(this))
				.on ('dblclick', this.toggleZoom.bind(this));
		}.bind(this));

		var tiles = this.frames.find('.tile');
		this.frames.width((tiles.length * 100) + '%');
		this.index = index + direction;

		this.labels.closest('.labels').toggleClass('single', this.images[this.index].tags.indexOf('landscape') >= 0);
		this.labels.each(function (i, label) {
			var lang = $(label).attr('data-lang');
			$(label).toggleClass('selected', this.locale == lang).text(this.images[this.index][lang]);
		}.bind(this));

		$(document).scrollLeft(tiles.filter(function (i, tile) {
			return $(tile).data().index == this.index;
		}.bind(this)).index() * config.screenWidth);
	},

	showList: function (event) {
		var link = $(event.target);
		this.generateGrid(link.data().tag);
		this.toggleScreen('list');
	},

	showDetail: function (index) {
		var link = $(event.target);
		this.generateFrames(link.data().index, 0);
		this.toggleScreen('detail');
	},

	toggleZoom: function (event) {
		var image = $(event.target);
		var tile = image.closest('.tile');
		this.screens.detail.add(tile).toggleClass('zoom');

		if (this.screens.detail.hasClass('zoom')) {
			var img = new Image();
			img.src = image.css('background-image').replace(/url\(|\)$|"/ig, '');

			image.add(tile).width(Math.max(img.width, config.frameWidth)).height(img.height);
			$(document).scrollLeft($(document).width() / 2 - config.screenWidth / 2).scrollTop($(document).height() / 2 - config.screenHeight / 2);
			this.toolbar.addClass('invisible');
		}
		else {
			image.add(tile).width('').height('');
			$(document).scrollLeft(tile.index() * config.screenWidth);
			this.toolbar.removeClass('invisible');
		}
	},

	/* --- actions --- */
	back: function () {
		this.toggleScreen(this.screen.prev('.screen').prop('id'));
	},

	slideshow: function () {
		location.reload();
	},

	flick: function (event) {
		if (this.screens.detail.hasClass('zoom'))
			return;

		var start = {
			cursor: event.originalEvent.touches[0].clientX,
			scroll: $(document).scrollLeft()
		};

		this.screens.detail.on('touchmove.flick', function (event) {
			$(document).scrollLeft(start.scroll + start.cursor - event.originalEvent.touches[0].clientX);
		});

		this.screens.detail.on('touchend', function () {
			this.screens.detail.off('touchstart touchmove.flick touchend');

			var offset = $(document).scrollLeft() - start.scroll;
			var direction = Math.abs(offset) > config.screenWidth / 6 ? (offset > 0 ? 1 : -1) : 0;
			$('body').animate({ scrollLeft: start.scroll + direction * config.screenWidth }, 1.4 * 1000, function () {
				if (direction)
					this.generateFrames(null, direction);
				this.screens.detail.on('touchstart', this.flick.bind(this));
			}.bind(this));
		}.bind(this));
	},

	language: function (event) {
		$('#language a.selected').removeClass('selected');
		var lang = $(event.target).addClass('selected').data().lang;
		var menulabels = this.screens.home.find('.menu a');
		menulabels.text(function (i) {
			return menulabels.eq(i).data(lang);
		});
		this.locale = lang;
	},

	/* --- initialize --- */
	init: function (data, kiosk) {
		this.data = data[kiosk];
		this.locale = 'slo'; //default

		this.screens = {
			slideshow: $('#slideshow.screen'),
			home: $('#home.screen'),
			list: $('#list.screen'),
			detail: $('#detail.screen')
		};

		this.slides = $('#slides');
		this.grid = $('#grid');
		this.frames = $('#frames');
		this.toolbar = $('#toolbar');
		this.labels = $('#labels label');

		$('#slideshow').on('click', function () { this.toggleScreen('home'); }.bind(this));
		$('#menu a').on('click', this.showList.bind(this));
		$('#language a').on('click', this.language.bind(this));
		$('#home_btn').on('click', this.slideshow.bind(this));
		$('#back_btn').on('click', this.back.bind(this));

		$(document).on('touchmove', '#detail:not(.zoom)', function (event) { event.preventDefault(); }); //disable touch scrolling
		this.screens.detail.on('touchstart', this.flick.bind(this));

		var timer;
		$(document).on('touchstart', function () {
			clearTimeout(timer);
			timer = setTimeout(this.slideshow, config.activityDelay * 1000);
		}.bind(this));

		this.toggleScreen('slideshow');
	}
};

/* init */
$(window).on('load', () => {
	Object.create(Kiosk).init(data, kiosk);
});
