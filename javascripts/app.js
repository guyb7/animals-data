d3.json("https://raw.githubusercontent.com/guyb7/animals-data/master/data.json", function(error, raw_data) {
  var svg = d3.select("#app")
    .append("svg")
    .attr("width", 900)
    .attr("height", 630);

  var offset = {x: 110, y: -60};
  
  svg.call(d3.behavior.zoom().on("zoom", function () {
    var t = d3.event.translate;
    svg.select('svg g.chart').attr("transform", "translate(" + (t[0] + offset.x) + ',' + (t[1] + offset.y) + ")" + " scale(" + d3.event.scale + ")")
  }));
  svg.on("click", null);
  svg.on("dblclick.zoom", null);

  var phylum = 2; // phylum
  var animal_class = 3; // class
  var species = 7; // species
  var name = 8; // common-name
  var yAxis = 18; // adult-weight-(g)
  var xAxis = 20;  // maximum-longevity-(yrs)

  var processed_data = process_data(raw_data);
  var data = _.clone(processed_data);
  init_filters(processed_data, data);

  var xScale, yScale;

  svg.append('g')
    .classed('chart', true)
    .attr('transform', 'translate(' + offset.x + ', ' + offset.y + ')');

  // Best fit line (to appear behind points)
  d3.select('svg g.chart')
    .append('line')
    .attr('id', 'bestfit');

  // Axis labels
  d3.select('svg g.chart')
    .append('text')
    .attr({'id': 'xLabel', 'x': 400, 'y': 670, 'text-anchor': 'middle'})
    .text(data.fields[xAxis]);

  d3.select('svg g.chart')
    .append('text')
    .attr('transform', 'translate(-70, 330)rotate(-90)')
    .attr({'id': 'yLabel', 'text-anchor': 'middle'})
    .text(data.fields[yAxis]);

  // Render points
  updateScales(data);

  var render = function(data){
    var pointColour = d3.scale.category20b();
    var circles = d3.select('svg g.chart')
      .selectAll('circle')
      .data(data.data);
    circles.enter()
      .append('circle')
      .attr('cx', function(d) {
        return xScale(parseFloat(d[xAxis]));
      })
      .attr('cy', function(d) {
        return yScale(parseFloat(d[yAxis]));
      })
      .attr('fill', function(d, i) {return pointColour(i);})
      .style('cursor', 'pointer')
      .on('click', function(d) {
        window.open('http://images.google.com/images?q=' + d[species].replace(/\s/, '+'), '_blank');
      })
      .on('mouseover', function(d) {
        document.getElementById('animalName').innerHTML = d[name];
        document.getElementById('animalX').innerHTML = d[xAxis];
        document.getElementById('animalY').innerHTML = d[yAxis];
      });
    circles.exit().remove();
  };

  render(data);
  updateChart(data);


  //// RENDERING FUNCTIONS
  function updateChart(data) {
    updateScales(data);

  // Render axes
  var xa = document.getElementById('xAxis');
  if (xa) {
    xa.outerHTML = "";
    delete xa;
  }
  var ya = document.getElementById('yAxis');
  if (ya) {
    ya.outerHTML = "";
    delete ya;
  }
  d3.select('svg g.chart')
    .append("g")
    .attr('transform', 'translate(0, 630)')
    .attr('id', 'xAxis')
    .call(makeXAxis);
  d3.select('svg g.chart')
    .append("g")
    .attr('id', 'yAxis')
    .attr('transform', 'translate(-10, 0)')
    .call(makeYAxis);

    d3.select('svg g.chart')
      .selectAll('circle')
      .transition()
      .duration(500)
      .ease('quad-out')
      .attr('cx', function(d) {
        return isNaN(d[xAxis]) ? d3.select(this).attr('cx') : xScale(d[xAxis]);
      })
      .attr('cy', function(d) {
        return isNaN(d[yAxis]) ? d3.select(this).attr('cy') : yScale(d[yAxis]);
      })
      .attr('r', function(d) {
        return isNaN(d[xAxis]) || isNaN(d[yAxis]) ? 0 : 3;
      })
      .attr('opacity', 0.8);

    // Update correlation
    var xArray = _.map(data.data, function(d) {return parseInt(d[xAxis],10);});
    var yArray = _.map(data.data, function(d) {return parseInt(d[yAxis],10);});
    var c = getCorrelation(xArray, yArray);
    var x1 = xScale.domain()[0], y1 = c.m * x1 + c.b;
    var x2 = xScale.domain()[1], y2 = c.m * x2 + c.b;
    d3.select('#bestfit')
      .attr({'x1': xScale(x1), 'y1': yScale(y1), 'x2': xScale(x2), 'y2': yScale(y2)});
  }

  function updateScales(data) {
    var bounds = getBounds(data.data, 1);
    xScale = d3.scale.linear()
                    .domain([bounds[xAxis].min, bounds[xAxis].max])
                    .range([20, 780]);

    yScale = d3.scale.linear()
                    .domain([bounds[yAxis].min, bounds[yAxis].max])
                    .range([600, 100]);
  }

  function getBounds(d, paddingFactor) {
    // Find min and maxes (for the scales)
    paddingFactor = typeof paddingFactor !== 'undefined' ? paddingFactor : 1;
    var keys = _.keys(d[0]), b = {};
    _.each(keys, function(k) {
      b[k] = {};
      _.each(d, function(d) {
        if(isNaN(parseInt(d[k], 10)))
          return;
        d[k] = parseInt(d[k], 10);
        if(b[k].min === undefined || d[k] < b[k].min)
          b[k].min = d[k];
        if(b[k].max === undefined || d[k] > b[k].max)
          b[k].max = d[k];
      });
      b[k].max > 0 ? b[k].max *= paddingFactor : b[k].max /= paddingFactor;
      b[k].min > 0 ? b[k].min /= paddingFactor : b[k].min *= paddingFactor;
      b[k].max = Math.min(b[k].max, 1000);
    });
    return b;
  }

  function makeXAxis(s) {
    s.call(d3.svg.axis()
      .scale(xScale)
      .orient("bottom"));
  }

  function makeYAxis(s) {
    s.call(d3.svg.axis()
      .scale(yScale)
      .orient("left"));
  }

  function process_data(original_data) {
    var data = _.clone(original_data);
    data.data = _.filter(data.data, function(d) {
      return d[xAxis].length > 0 && d[yAxis].length > 0 ? true : false;
    });

    // Convert g to kg
    data.fields = _.map(data.fields, function(f) {
      if (f === 'adult-weight-(g)') {
        return 'adult-weight-(kg)'
      } else {
        return f;
      }
    });
    data.data = _.map(data.data, function(d){
      d[yAxis] = Number(d[yAxis], 10)/1000;
      return d;
    });
    return data;
  }

  function filter_data(original_data) {
    var data = _.clone(original_data);
    // Species filter
    var selected_species = getSelectValues(document.getElementById('filter_species'));
    if (selected_species.length > 0) {
      data.data = _.filter(data.data, function(d) {
        return _.indexOf(selected_species, d[animal_class]) > -1;
      });
    }
    return data;
  }

  function init_filters(raw_data, data) {
    var html = '';
    var species_types = {};
    _.each(raw_data.data, function(d){
      species_types[d[animal_class]] = (d[phylum] == 'Chordata');
    });
    _.each(species_types, function(v,k){
      html += '<option value="' + k + '" ' + (v ? 'selected' : '') + '>' + k + '</option>';
    });
    document.getElementById('filter_species').innerHTML = html;
    document.getElementById('update_data').addEventListener('click', function(){
      data = filter_data(raw_data);
      render(data);
      updateChart(data);
    });
  }
});

function getCorrelation(xArray, yArray) {
  function sum(m, v) {return m + v;}
  function sumSquares(m, v) {return m + v * v;}
  function filterNaN(m, v, i) {isNaN(v) ? null : m.push(i); return m;}

  // clean the data (because we know that some values are missing)
  var xNaN = _.reduce(xArray, filterNaN , []);
  var yNaN = _.reduce(yArray, filterNaN , []);
  var include = _.intersection(xNaN, yNaN);
  var fX = _.map(include, function(d) {return xArray[d];});
  var fY = _.map(include, function(d) {return yArray[d];});

  var sumX = _.reduce(fX, sum, 0);
  var sumY = _.reduce(fY, sum, 0);
  var sumX2 = _.reduce(fX, sumSquares, 0);
  var sumY2 = _.reduce(fY, sumSquares, 0);
  var sumXY = _.reduce(fX, function(m, v, i) {return m + v * fY[i];}, 0);

  var n = fX.length;
  var ntor = ( ( sumXY ) - ( sumX * sumY / n) );
  var dtorX = sumX2 - ( sumX * sumX / n);
  var dtorY = sumY2 - ( sumY * sumY / n);
 
  var r = ntor / (Math.sqrt( dtorX * dtorY )); // Pearson ( http://www.stat.wmich.edu/s216/book/node122.html )
  var m = ntor / dtorX; // y = mx + b
  var b = ( sumY - m * sumX ) / n;
  return {r: r, m: m, b: b};
}

function getSelectValues(select) {
  var result = [];
  var options = select && select.options;
  var opt;

  for (var i=0, iLen=options.length; i<iLen; i++) {
    opt = options[i];

    if (opt.selected) {
      result.push(opt.value || opt.text);
    }
  }
  return result;
}
