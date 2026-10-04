# Collection Cost Model

Each fresh item starts at enhancement 0. Every attempted level consumes one
scroll. Failure destroys the item; another item is acquired and starts at 0.
Prices are in diamonds with 0.01 precision. All probabilities are independent.

## Expectation and Variance

For one cycle ending at destruction or success, let P be survival probability,
C its cost, and D = E[C * 1(failure)]. Total cost T until success has:

    E[T] = E[C] / P
    E[T^2] = (E[C^2] + 2 D E[T]) / P

No normal-distribution assumption is made. Mean plus or minus a standard
deviation multiplier is not a cost percentile and is not displayed.

## Quartiles and Tail Probabilities

Quantile q is the minimum budget x with Pr(T <= x) >= q. The table shows
q = 0.25, 0.50, 0.75. Costs are discrete, so the achieved probability can be
larger than q. Neither quartile is a minimum or maximum possible total cost.
The two probability columns show Pr(T > E[T]) and Pr(T > 2 E[T]).

For a single failure outcome, geometric quantiles and tails are calculated
analytically. Otherwise, integer-cent lattice renewal masses are calculated
using the GCD of failed-cycle costs:

    mass[0] = P
    mass[n] = sum_j r_j * mass[n - failed_cost_j]

The successful final cycle cost is added to the lattice value. This directly
calculates the cost CDF, without a distributional approximation.

If the lattice would exceed 120,000 states, 100,000 independent samples of
the retry law are used. Let r_j be the unconditional probability of failing
at stage j, and P = 1 - sum_j r_j. Sample E ~ Exponential(1); conditional on E,
sample independent N_j ~ Poisson(E * r_j / P). Then:

    T = successful_cost + sum_j N_j * failed_cost_j

The joint probability generating function is:

    E[product_j z_j^N_j] = P / (1 - sum_j r_j z_j)

This is the negative-multinomial law of failures before the first success.
It avoids iterating through potentially billions of failed attempts. It is
not a normal approximation of total cost. Monte Carlo quantiles and tails
are estimates, marked with an approximation symbol. Fixed seeds and cached
item/scroll counts keep changes reproducible and sliders responsive.

Random variates use the Apache-2.0 licensed stdlib Poisson generator:
https://github.com/stdlib-js/random-base-poisson
The pinned vendor commit and license are included under vendor/.
