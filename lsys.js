/**
 * Copyright © 2015 Steve Muller <steve.muller@outlook.com>
 * This file is subject to the license terms in the LICENSE file found in the top-level directory of
 * this distribution and at http://github.com/stevemuller04/lsys.js/blob/master/LICENSE
 *
 * @author Steve Muller <steve.muller@outlook.com>
*/
"use strict";

/**
 * Represents an L-system renderer.
 * @class
 */
function LSys()
{
	/**
	 * In each recursive step, the specified rules are applied to replace
	 * a symbol by the sequence of symbols as specified by a rule.
	 * Note that the order of the rules *does* matter.
	 * Each entry is of the form
	 * {
	 *     index: <the index in the 'rules' collection>,
	 *     literal: <the string literal of the symbol>,
	 *     substitutes: <a collection of literals as returned by any of the literal methods>
	 * }.
	 */
	var rules = [];
	/**
	 * Symbol definitions give each symbol a meaning after the rule application process has terminated.
	 * Each symbol can have only one meaning. Non-defined symbols are ignored.
	 */
	var definitions = {};

	/**
	 * Literal function. Returns a literal which draws a leaf.
	 * @param {Number} base_size - The base size in pixels of the leaf to draw.
	 */
	this.leaf = function(base_size)
	{
		return new (function()
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				var size = base_size * Math.pow(1.03, state.thick)*0.9;
				environment.canvas.globalCompositeOperation = "source-over";
				environment.canvas.beginPath();
				environment.canvas.moveTo(state.x, state.y);
				environment.canvas.bezierCurveTo(
					state.x + size/2 * Math.cos(state.h - Math.PI/4), state.y + size/2 * Math.sin(state.h - Math.PI/4),
					state.x + size/2 * Math.cos(state.h), state.y + size/2 * Math.sin(state.h),
					state.x + size * Math.cos(state.h), state.y + size * Math.sin(state.h));
				environment.canvas.bezierCurveTo(
					state.x + size/2 * Math.cos(state.h), state.y + size/2 * Math.sin(state.h),
					state.x + size/2 * Math.cos(state.h + Math.PI/4), state.y + size/2 * Math.sin(state.h + Math.PI/4),
					state.x, state.y);
				environment.canvas.fillStyle = "rgb(0," + Math.round(Math.random()*120+100) + ",0)";
				environment.canvas.fill();
				environment.canvas.globalCompositeOperation = "destination-over";
			};
			this.measure = function(state, environment, depth, lastRuleIndex)
			{
				var size = base_size * Math.pow(1.03, state.thick)*0.9;
				environment.bounds.minx = Math.min(environment.bounds.minx, state.x - 2*size);
				environment.bounds.maxx = Math.max(environment.bounds.maxx, state.x + 2*size);
				environment.bounds.miny = Math.min(environment.bounds.miny, state.y - 2*size);
				environment.bounds.maxy = Math.max(environment.bounds.maxy, state.y + 2*size);
			};
		})();
	};

	/**
	 * Literal function. Returns a literal which rotates the cursor by a certain angle.
	 * @param {Number} angle - The angle in degrees by which to rotate the cursor (counter-clockwise).
	 */
	this.rot = function(angle)
	{
		return new (function(angle)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				state.h += angle * Math.PI / 180;
			};
			this.measure = this.render;
		})(angle);
	};

	/**
	 * Literal function. Returns a literal which rotates the angle by a (uniformly at) random angle.
	 * @param {Number} angle_a - The lowest possible value of the random angle. Must be <= angle_b.
	 * @param {Number} angle_b - The highest possible value of the random angle. Must be >= angle_a.
	 */
	this.randomrot = function(angle_a, angle_b)
	{
		return new (function(angle_a, angle_b)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				var angle = Math.random() * (angle_b - angle_a) + angle_a;
				state.h += angle * Math.PI / 180;
			};
			this.measure = this.render;
		})(angle_a, angle_b);
	};

	/**
	 * Literal function. Returns a literal which sets the thickness of the cursor.
	 * @param {Number} absoluteThickness - The (absolute) thickness in pixels to apply to the cursor. Must be >= 0.
	 */
	this.thick = function(absoluteThickness)
	{
		if (absoluteThickness < 0)
			absoluteThickness = 0;
		return new (function(absoluteThickness)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				state.thick = absoluteThickness;
			};
			this.measure = function(){};
		})(absoluteThickness);
	};

	/**
	 * Literal function. Returns a literal which thickens the cursor.
	 * @param {Number} relativeThickness - The relative factor by which to thicken the cursor. Must be >= 0. Values < 1 thin the cursor.
	 */
	this.relthick = function(relativeThickness)
	{
		if (relativeThickness < 0)
			relativeThickness = 0;
		return new (function(relativeThickness)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				state.thick *= relativeThickness;
			};
			this.measure = function(){};
		})(relativeThickness);
	};

	/**
	 * Literal function. Returns a literal which stores the state of the cursor.
	 * Use this.restore() to obtain a literal which restore the state.
	 */
	this.save = function()
	{
		return new (function()
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				var copy = {};
				for (var key in state)
					copy[key] = state[key];
				environment.statestack.push(copy);
			};
			this.measure = this.render;
		})();
	};

	/**
	 * Literal function. Returns a literal which restores the last saved state of the cursor.
	 */
	this.restore = function()
	{
		return new (function()
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				var oldstate = environment.statestack.pop();
				for (var key in oldstate)
					state[key] = oldstate[key];
			};
			this.measure = this.render;
		})();
	};

	/**
	 * Literal function. Returns a literal which moves the cursor ahead without leaving any traces (without drawing).
	 * @param {Number} distance - The distance in pixels by which to move the cursor ahead. The direction can be changed by rotating literals as obtained by e.g. this.rot().
	 */
	this.move = function(distance)
	{
		return new (function(distance)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				state.x += distance * Math.cos(state.h);
				state.y += distance * Math.sin(state.h);
			};
			this.measure = function(state, environment, depth, lastRuleIndex)
			{
				state.x += distance * Math.cos(state.h);
				state.y += distance * Math.sin(state.h);
				environment.bounds.minx = Math.min(environment.bounds.minx, state.x);
				environment.bounds.maxx = Math.max(environment.bounds.maxx, state.x);
				environment.bounds.miny = Math.min(environment.bounds.miny, state.y);
				environment.bounds.maxy = Math.max(environment.bounds.maxy, state.y);
			};
		})(distance);
	};

	/**
	 * Literal function. Returns a literal which moves the cursor ahead. The distance travelled is drawn to the canvas.
	 * @param {Number} distance - The distance in pixels by which to move the cursor ahead. The direction can be changed by rotating literals as obtained by e.g. this.rot().
	 */
	this.draw = function(distance)
	{
		return new (function(distance)
		{
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				var newX = state.x + distance * Math.cos(state.h);
				var newY = state.y + distance * Math.sin(state.h);
				environment.canvas.beginPath();
				environment.canvas.lineWidth = state.thick;
				environment.canvas.moveTo(state.x, state.y);
				environment.canvas.lineTo(newX, newY);
				environment.canvas.stroke();
				state.x = newX;
				state.y = newY;
			};
			this.measure = function(state, environment, depth, lastRuleIndex)
			{
				state.x += distance * Math.cos(state.h);
				state.y += distance * Math.sin(state.h);
				environment.bounds.minx = Math.min(environment.bounds.minx, state.x);
				environment.bounds.maxx = Math.max(environment.bounds.maxx, state.x);
				environment.bounds.miny = Math.min(environment.bounds.miny, state.y);
				environment.bounds.maxy = Math.max(environment.bounds.maxy, state.y);
			};
		})(distance);
	};

	/**
	 * Literal function. Returns a literal which references a defined symbol (using this.define()).
	 * Use this method in combination with this.define() to construct the recursive behaviour of the L-system. 
	 * @param {string} name - The name of a previously defined symbol. If the symbol does not exist, this literal has no effect.
	 */
	this.lit = function(name)
	{
		return new (function(name)
		{
			function recursion(funcname, state, environment, depth, lastRuleIndex)
			{
				// Apply the first rule which matches the literal and which does not exceed the required depth
				var foundAnyRule = false;
				for (var i = 0; i < rules.length; i++)
				{
					var rule = rules[i];
					if (rule.literal == name)
					{
						// Compute the depth in effect. Rules succeeding the current one
						// are still processed on the same level, but prior rules are handled
						// on a deeper stage.
						var newDepth = rule.index > lastRuleIndex ? depth : depth - 1;
						if (newDepth > 0)
						{
							for (var i = 0; i < rule.substitutes.length; i++)
							{
								rule.substitutes[i][funcname](state, environment, newDepth, rule.index);
							}

							foundAnyRule = true;
							break;
						}
					}
				}
				if (!foundAnyRule && name in definitions)
				{
					var substitutes = definitions[name];
					for (var i = 0; i < substitutes.length; i++)
					{
						substitutes[i][funcname](state, environment, 0, -1);
					}
				}
			}
			this.render = function(state, environment, depth, lastRuleIndex)
			{
				recursion("render", state, environment, depth, lastRuleIndex);
			};
			this.measure = function(state, environment, depth, lastRuleIndex)
			{
				recursion("measure", state, environment, depth, lastRuleIndex);
			};
		})(name);
	};

	/**
	 * Defines a symbol. Symbol definitions specify the meaning of a literal which remained after the recursive rule application phase.
	 * @param {string} name - The name of the symbol which should obtain a meaning.
	 * @param {array} substitutes - An array of literals (each of which must be obtained by some literal method) which specify what the symbol stands for.
	 */
	this.define = function(name, substitutes)
	{
		definitions[name] = substitutes;
	};

	/**
	 * Defines a new replacement rule. In the recursive replacement phase of the L-system, each occurrence of the specified named symbol
	 * is replaced by the given substitutes. Rules are applied in the order they have been added. It is totally possible to specify multiple
	 * rules for the same symbol.
	 * @param {string} name - The name of the symbol which is recursively replaced.
	 * @param {array} substitutes - An array of literals (each of which must be obtained by some literal method) which specify what the symbol is replaced by.
	 */
	this.rule = function(name, substitutes)
	{
		rules.push({ index: rules.length, literal: name, substitutes: substitutes });
	};

	/**
	 * Measures the dimensions of the drawing obtained by evaluating the L-system.
	 * Useful to fit the result of the L-system onto a canvas of fixed size.
	 * @param {array} axiom - The initial axiom of the L-system. The axiom is an array of literals (each of which must be obtained by some literal method) which the L-system starts from in the recursion phase.
	 * @param {integer} depth - The number of recursion steps. Must be > 0.
	 */
	this.measure = function(axiom, depth)
	{
		var state = { x: 0, y: 0, h: 0, thick: 1 };
		var environment = { statestack: [], bounds: { minx: 0, maxx: 0, miny: 0, maxy: 0 } };
		for (var i = 0; i < axiom.length; i++)
		{
			axiom[i].measure(state, environment, depth - 1, -1);
		}
		return environment.bounds;
	};

	/**
	 * Renders the output of the L-system to a canvas.
	 * @param {array} axiom - The initial axiom of the L-system. The axiom is an array of literals (each of which must be obtained by some literal method) which the L-system starts from in the recursion phase.
	 * @param {CanvasElement} canvas - The HTML canvas element to draw onto.
	 * @param {integer} depth - The number of recursion steps. Must be > 0.
	 */
	this.render = function(axiom, canvas, depth)
	{
		var state = { x: 0, y: 0, h: 0, thick: 1 };
		var environment = { canvas: canvas.getContext("2d"), statestack: [] };
		for (var i = 0; i < axiom.length; i++)
		{
			axiom[i].render(state, environment, depth - 1, -1);
		}
	};

	/**
	 * Renders the output of the L-system to a canvas so that its content fits into the boundaries of the latter.
	 * @param {array} axiom - The initial axiom of the L-system. The axiom is an array of literals (each of which must be obtained by some literal method) which the L-system starts from in the recursion phase.
	 * @param {CanvasElement} canvas - The HTML canvas element to draw onto.
	 * @param {integer} depth - The number of recursion steps. Must be > 0.
	 */
	this.renderAndFit = function(axiom, canvas, depth)
	{
		var bounds = this.measure(axiom, depth);
		var w = bounds.maxx - bounds.minx;
		var h = bounds.maxy - bounds.miny;
		var ctx = canvas.getContext("2d");
		ctx.scale(canvas.width / w, canvas.height / h);
		ctx.translate(-bounds.minx, -bounds.miny);
		this.render(axiom, canvas, depth);
	};
}