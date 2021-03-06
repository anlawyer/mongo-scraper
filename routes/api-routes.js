var axios = require('axios');
var cheerio = require('cheerio');
var db = require('../models');

module.exports = function (app) {
  app.get('/', function (req, res) {
    db.Article
    .find().sort({_id: -1})
    .then(function (dbArticle) {
      res.render('index', {articles: dbArticle});
    })
    .catch(function (error) {
      res.json(error);
    });
  });

  app.get('/saved', function (req, res) {
    db.Article
    .find({saved: true}).sort({_id: -1})
    .populate('comments')
    .then(function (dbArticle) {
      res.render('saved', {articles: dbArticle});
    })
    .catch(function (error) {
      res.json(error);
    });
  });

  app.get('/scrape', function (req, res) {
    axios.get('https://www.fastcompany.com/').then(function (response) {
      var $ = cheerio.load(response.data);

      $('.all-feed__wrapper .card a .card__text-wrapper').each(function (i, element) {
        var result = {};

        result.title = $(this).parent('a').attr('title');
        result.link = $(this).parent('a').attr('href');
        result.summary = $(this).children('h3').text();

        var first = result.link.slice(0, 6);
        if (first !== 'https:') {
          result.link = 'https://www.fastcompany.com' + result.link;
        }

        if (result.title !== undefined && result.title !== 'See More all on page 1') {
          db.Article
          .update(result, result, {upsert: true})
          .then(function (dbArticle) {
            console.log('inserted into db.');
          })
          .catch(function (err) {
            res.json(err);
          });
        }
      });
    });
  });

  app.post('/articles/save/:id', function (req, res) {
    db.Article
      .findOneAndUpdate({ _id: req.params.id }, { $set: {saved: true} })
      .then(function (dbArticle) {
        res.render('index', {articles: dbArticle});
      })
      .catch(function (error) {
        res.json(error);
      });
  });

  app.post('/articles/unsave/:id', function (req, res) {
    db.Article
      .findOneAndUpdate({ _id: req.params.id }, { $set: {saved: false} })
      .then(function (dbArticle) {
        res.render('saved', {articles: dbArticle});
      })
      .catch(function (error) {
        res.json(error);
      });
  });

  app.post('/articles/:id', function (req, res) {
    db.Comments
      .create(req.body)
      .then(function (dbComment) {
        return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { comments: dbComment._id }}, { new: true });
      })
      .then(function (dbArticle) {
        res.json(dbArticle);
      })
      .catch(function (error) {
        res.json(error);
      });
  });

  app.delete('/remove/:id', function (req, res) {
    db.Comments
    .findOneAndRemove({_id: req.params.id})
    .then(function (dbComment) {
      return db.Article.update({comments: {_id: req.params.id}}, {$pull: { comments: dbComment._id }});
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (error) {
      res.json(error);
    });
  });
};
