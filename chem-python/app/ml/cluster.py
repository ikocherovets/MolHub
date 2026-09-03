"""K-Means and Self-Organizing Map clustering over the same Morgan
fingerprints used elsewhere (see features.py) — two different answers to
"which molecules are structurally alike": K-Means partitions into k flat
groups, SOM arranges every molecule on a 2D grid so nearby units are
structurally similar (a topology-preserving map, not just a label)."""

import numpy as np
from minisom import MiniSom
from sklearn.cluster import KMeans

RANDOM_SEED = 42


def kmeans_labels(fingerprints: np.ndarray, k: int) -> list[int]:
    model = KMeans(n_clusters=k, random_state=RANDOM_SEED, n_init=10)
    return model.fit_predict(fingerprints).tolist()


def default_grid_size(n_samples: int) -> int:
    """Vesanto's rule of thumb (~5*sqrt(n) units total), clamped to a size
    that stays legible and fast for a demo-scale library."""
    units = 5 * (n_samples**0.5)
    return max(2, min(8, round(units**0.5)))


def som_units(fingerprints: np.ndarray, grid_size: int) -> list[tuple[int, int]]:
    """Trains a grid_size x grid_size SOM and returns each sample's best
    matching unit as (col, row)."""
    som = MiniSom(
        grid_size,
        grid_size,
        fingerprints.shape[1],
        sigma=max(1.0, grid_size / 4),
        learning_rate=0.5,
        random_seed=RANDOM_SEED,
    )
    som.random_weights_init(fingerprints)
    som.train(fingerprints, 1000, random_order=True, verbose=False)
    return [som.winner(fp) for fp in fingerprints]
