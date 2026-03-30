import pandas as pd
import numpy as np
from tqdm import tqdm
import os

def load_and_clean(data_path):
    all_files = [f for f in os.listdir(data_path) if f.endswith('.parquet')]
    print(f"Found {len(all_files)} parquet files")

    dfs = []
    for file in tqdm(all_files, desc="Loading files"):
        df = pd.read_parquet(os.path.join(data_path, file))
        dfs.append(df)

    print("Merging all files...")
    df = pd.concat(dfs, ignore_index=True)
    print(f"Total rows loaded: {df.shape[0]}")

    # fix column names
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
    print("Columns cleaned")

    # drop duplicates
    df.drop_duplicates(inplace=True)
    print(f"After dropping duplicates: {df.shape[0]} rows")

    # replace inf values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # drop nulls
    df.dropna(inplace=True)
    print(f"After dropping nulls: {df.shape[0]} rows")

    # check label column
    print("\nAttack distribution:")
    print(df['label'].value_counts())

    return df

if __name__ == "__main__":
    df = load_and_clean("cicids_data/")
    df.to_parquet("cicids_clean.parquet", index=False)
    print("\nSaved to cicids_clean.parquet")